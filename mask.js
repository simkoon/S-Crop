process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
const { ipcRenderer, clipboard, nativeImage } = require('electron');
const { getCurrentWindow, globalShortcut } = require('@electron/remote');
const fs = require('fs');
const path = require('path');

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

        fs.writeFile(
          `${path.resolve(__dirname, '..')}/assets/test.png`,
          `${imgUrl}`.split(';base64,').pop(),
          'base64',
          function (err) {
            Tesseract.recognize(imgUrl, 'eng+kor', {
              logger: (m) => m,
            }).then(({ data: { text } }) => {
              const pasedHtml = text
                .split('\n')
                .map(
                  (line) =>
                    `<tr>${line
                      .split(' ')
                      .reduce(
                        (result, td) => `${result}<td>${td}</td>`,
                        ''
                      )}</tr>`
                );
              clipboard.writeHTML(`
                <table>
                  ${pasedHtml.reduce((acc, cur) => acc + cur, '')}
                  <img src="${path.resolve(__dirname, '..')}/assets/test.png"/>
                </table>`);
              var x = document.getElementById('snackbarText');
              x.innerHTML = 'Text copied to clipboard..!!❤️';
              x1.className = x1.className.replace('show', '');
              x.className = 'show';
              setTimeout(function () {
                x.className = x.className.replace('show', '');
                window.close();
              }, 1000);
            });
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
