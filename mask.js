process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
const { ipcRenderer, clipboard, nativeImage } = require('electron');
const { getCurrentWindow, globalShortcut } = require('@electron/remote');
const fs = require('fs');
const path = require('path');
const { PSM } = require('tesseract.js');

function blob_to_buffer(blob, callback) {
  const file_reader = new FileReader();

  file_reader.addEventListener(
    'loadend',
    (event) => {
      if (file_reader.error) {
        callback(file_reader.error);
      } else {
        callback(null, Buffer.from(file_reader.result));
      }
    },
    false
  );

  file_reader.readAsArrayBuffer(blob);
  return file_reader;
}

var window = getCurrentWindow();

function mask(imageURL, type) {
  var img = document.getElementById('target');
  img.src = imageURL;
  Jcrop.load('target').then((img) => {
    const stage = Jcrop.attach('target', {
      shade: true,
    });
    stage.addClass('jcrop-ux-no-outline');
    stage.listen('crop.change', function (widget, e) {
      const pos = widget.pos;

      var x1 = document.getElementById('snackbarLoad');
      x1.className = 'show';

      var cc = pos;
      var image = document.getElementById('target');

      var heightScale = image.naturalHeight / image.height;
      var widthScale = image.naturalWidth / image.width;

      cc.x = cc.x * widthScale;
      cc.y = cc.y * heightScale;
      cc.w = cc.w * widthScale;
      cc.h = cc.h * heightScale;

      var canvasElement = document.createElement('canvas');

      canvasElement.width = Math.floor(cc.w);
      canvasElement.height = Math.floor(cc.h);
      var ctx = canvasElement.getContext('2d');
      ctx.drawImage(
        image,
        cc.x,
        cc.y,
        cc.w,
        cc.h,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );
      stage.destroy();

      var imgUrl = canvasElement.toDataURL();
      if (type == 1) {
        canvasElement.toBlob(function (blob) {
          blob_to_buffer(blob, async (err, buffer) => {
            if (err) console.log('err');

            var native_image = nativeImage.createFromBuffer(buffer);
            clipboard.writeImage(native_image);

            var x = document.getElementById('snackbarText');
            x.innerHTML = 'Cropped image copied to clipboard..!!❤️';
            x1.className = x1.className.replace('show', '');
            x.className = 'show';
            setTimeout(function () {
              x.className = x.className.replace('show', '');
              window.close();
            }, 1000);
          });
        });
      } else if (type == 2) {
        var imgUrl = canvasElement.toDataURL();
        const exists = fs.existsSync(`${path.resolve(__dirname, '..')}/assets`);
        if (exists === false) {
          fs.mkdirSync(`${path.resolve(__dirname, '..')}/assets`);
        }
        const imgPixels = ctx.getImageData(0, 0, cc.w, cc.h);

        for (var y = 0; y < imgPixels.height; y++) {
          for (var x = 0; x < imgPixels.width; x++) {
            var i = y * 4 * imgPixels.width + x * 4;
            var avg =
              (imgPixels.data[i] +
                imgPixels.data[i + 1] +
                imgPixels.data[i + 2]) /
              3;
            imgPixels.data[i] = avg;
            imgPixels.data[i + 1] = avg;
            imgPixels.data[i + 2] = avg;
          }
        }
        ctx.putImageData(
          imgPixels,
          0,
          0,
          0,
          0,
          imgPixels.width,
          imgPixels.height
        );
        const greyImg = canvasElement.toDataURL();
        fs.writeFile(
          `${path.resolve(__dirname, '..')}/assets/test.png`,
          `${imgUrl}`.split(';base64,').pop(),
          'base64',
          async function (err) {
            const worker = await Tesseract.createWorker();

            await worker.loadLanguage('eng+kor');
            await worker.initialize('eng+kor');
            await worker.setParameters({
              preserve_interword_spaces: '0',
              tessedit_pageseg_mode: PSM.AUTO,
            });
            const {
              data: { text },
            } = await worker.recognize(greyImg);
            clipboard.writeHTML(`
            <table>
              ${text
                .replaceAll('|', '')
                .split('\n')
                .map(
                  (line) =>
                    `<tr>${line
                      .split(' ')
                      .reduce(
                        (result, td) =>
                          td.trim() !== '' ? `${result}<td>${td}</td>` : result,
                        ''
                      )}</tr>`
                )
                .reduce((acc, cur) => acc + cur, '')}
              <img src="${path.resolve(__dirname, '..')}/assets/test.png"/>
            </table>`);
            const x = document.getElementById('snackbarText');
            x.innerHTML = 'Text copied to clipboard..!!❤️';
            x1.className = x1.className.replace('show', '');
            x.className = 'show';
            setTimeout(function () {
              x.className = x.className.replace('show', '');
              window.close();
            }, 1000);
            await worker.terminate();
          }
        );
      }
    });
  });
}

ipcRenderer.on('request-object', function (event, requestObject) {
  var imageUrl = requestObject.imageURL;
  var type = requestObject.type;
  if (type == 1) {
    mask(imageUrl, 1);
  } else if (type == 2) {
    mask(imageUrl, 2);
  }
});
