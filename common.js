function ge(e) {return document.getElementById(e)};
function isArray(obj) { return Object.prototype.toString.call(obj) === '[object Array]'; }
function pad(s, len, ch, r) { return (r ? s : '') + (new Array(Math.max(0, len - (s + '').length + 1))).join(ch ? ch : '0') + (r ? '' : s); }
function num(n,cs) {
  n = n % 100;
  if ((n % 10 == 0) || (n % 10 > 4) || (n > 4 && n < 21)) {
    return cs[2];
  } else
  if (n % 10 == 1) {
    return cs[0];
  } else {
    return cs[1];
  }
}

var month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/*
var access_token = localStorage['access_token']; // TODO: move all options to 'opts'
var quickUploadOwner = localStorage['qu_owner'] || 0;
var quickUploadAlbum = localStorage['qu_album'] || 0;
var quickUploadName = localStorage['qu_name'] || '...';
var albums = {};
var first_name = '', last_name = '', user_id = 0;
*/

var opts = {};
function loadOptions(defaults) {
  for (var key in defaults) {
    opts[key] = localStorage[key] ? JSON.parse(localStorage[key]) : defaults[key];
  }
}
function saveOptions(update, silent) {
  if (update) {
    for (var key in update) {
      opts[key] = update[key];
      localStorage[key] = JSON.stringify(update[key]);
    }
  }
  if (!silent) {
    chrome.runtime.sendMessage({ message: 'updateOptions', update: update });
  }
}
loadOptions({
  accessToken: false,
  firstName: false,
  lastName: false,
  userID: false,

  showAlbum: true,
  showMessage: true,
  showPost: true,
  showFullPost: true,

  albums: [],
  afterUpload: false,
});

// Old options, to be removed
opts['accessToken'] = opts['accessToken'] || localStorage['access_token'];
if (opts['albums'].length == 0 && localStorage['qu_owner'] && localStorage['qu_album']) {
  opts['albums'] = [{
    group: parseInt(localStorage['qu_owner']) ? {
      id: parseInt(localStorage['qu_owner'])
    } : false,
    album: {
      id: parseInt(localStorage['qu_album']),
      title: localStorage['qu_name']
    }
  }];
  if (opts['albums'][0].group) {
    api('groups.getById', { group_id: opts['albums'][0].group.id }, function(data) {
      if (data.response && data.response[0]) {
        opts['albums'][0].group = data.response[0];
      }
    });
  }
}
if (opts['albums'].length == 0) {
  opts['albums'] = [{ group: false, album: [] }];
}
saveOptions();

function attach(urls, post) {
  chrome.tabs.create({ url: post ? 'http://vk.com/feed?w=postbox' : 'http://vk.com/write' }, function(tab) {
    chrome.tabs.executeScript(tab.id, {
      //file: 'attach.js'
      code: "var e = document.createElement('script');e.innerHTML = '\\n\
(function(window) {\\n\
function attach(blob, src) {\\n\
  var match = src.match(/\\\\/([^\\\\/?]+?)(\\\\.([^\\\\/.?]+))?($|\\\\?)/);\\n\
  var isDoc = (blob.type == \\'image/gif\\'), ext = isDoc ? \\'.gif\\' : (match[2] || \\'.jpg\\');\\n\
  var fname = match[1] + ext;\\n\
  var url = isDoc ? \\'docs.php\\' : \\'al_photos.php\\';\\n\
  var args = isDoc ? { act: \\'a_choose_doc_box\\', al: 1 } : { act: \\'choose_photo\\', max_files: 10 };\\n\
  var scripts = isDoc ? [\\'upload.js\\'] : [\\'photos.js\\', \\'upload.js\\'];\\n\
  var box = showBox(url, args, {stat: scripts, onDone: function() {\\n\
    if (!box) return;\\n\
    var __FormData = window.FormData;\\n\
    window.FormData = function() {\\n\
      var obj = new __FormData();\\n\
      var __append = obj.append;\\n\
      obj.append = function(name, file) {\\n\
        return __append.call(this, name, file, fname);\\n\
      };\\n\
      return obj;\\n\
    };\\n\
    blob.fileName = blob.name = fname;\\n\
    Upload.onFileApiSend(cur.uplId, [ blob ]);\\n\
    window.FormData = __FormData;\\n\
  }});\\n\
  box.show();\\n\
};\\n\
window.addEventListener(\\'message\\', function(event) {\\n\
  if (event.data.message && (event.data.message == \\'attachDataUrl\\')) {\\n\
    var url = event.data.url;\\n\
    var bytes;\\n\
    if (url.split(\\',\\')[0].indexOf(\\'base64\\') >= 0) {\\n\
      bytes = atob(url.split(\\',\\')[1]);\\n\
    } else {\\n\
      bytes = unescape(url.split(\\',\\')[1]);\\n\
    }\\n\
    var mime = url.split(\\',\\')[0].split(\\':\\')[1].split(\\';\\')[0];\\n\
    var ab = new ArrayBuffer(bytes.length);\\n\
    var ia = new Uint8Array(ab);\\n\
    for (var i = 0; i < bytes.length; i++) {\\n\
      ia[i] = bytes.charCodeAt(i);\\n\
    }\\n\
    var id = event.data.post ? 1 : 2;\\n\
    var retryTimer = setInterval(function() {\\n\
      if (!cur.addMedia) { return; }\\n\
      clearInterval(retryTimer);\\n\
      cur.chooseMedia = cur.addMedia[id].chooseMedia;\\n\
      cur.showMediaProgress = function(type,i,info){\\n\
        if(info.loaded/info.total==1){\\n\
          window.postMessage({message:\\'attachDataUrlSuccess\\'}, \\'*\\');\\n\
        }\\n\
        cur.addMedia[id].showMediaProgress.apply(this,arguments);\\n\
      };\\n\
      cur.attachCount = cur.addMedia[id].attachCount;\\n\
      attach(new Blob([ab], { type: mime }), event.data.src);\\n\
    }, 100);\\n\
  }\\n\
}, false);\\n\
})(window);';document.head.appendChild(e);\n\
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {\n\
  if (request.message == 'attachDataUrl') {\n\
    window.postMessage(request, '*');\n\
  }\n\
});\n\
window.addEventListener('message', function(event) {\n\
  if (event.data.message && (event.data.message == 'attachDataUrlSuccess')) {\n\
    chrome.runtime.sendMessage(event.data);\n\
  }\n\
});\n\
"
    }, function() {
      var tasks = [];
      for (var i = 0, l = urls.length; i < l; i++) {
        var url = urls[i];
        if (url.indexOf('data:') == 0) { // Data URL
          tasks.push(function(onFinish) {
            currentOnFinish = onFinish;
            chrome.tabs.sendMessage(tab.id, {
              message: 'attachDataUrl',
              url: url,
              src: 'screenshot.png',
              post: post
            });
          });
        } else {
          tasks.push(downloadTask(tab.id, url, post));
        }
      }
      executeTasks(tasks, 500);
    });
  });
}

var currentOnFinish;
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message == 'attachDataUrlSuccess') {
    console.log('success');
    if (currentOnFinish) currentOnFinish();
  } else
  if (request.message == 'updateOptions') {
    saveOptions(request.update, true);
  }
});

function downloadTask(tabId, url, post) {
  return function(onFinish) {
    download(url, function(blob) {
      var reader = new FileReader();
      currentOnFinish = onFinish;
      console.log(url);
      reader.onload = function() {
        chrome.tabs.sendMessage(tabId, {
          message: 'attachDataUrl',
          url: reader.result,
          src: url,
          post: post
        });
      }
      reader.readAsDataURL(blob);
    });
  }
}

function executeTasks(tasks, timeout) {
  var len = tasks.length;
  var run = function(i){
    var task = tasks[i];
    task(function(){
      if (i<len - 1) {
        setTimeout(function() {
          run(i+1);
        }, timeout);
      }
    })
  }
  run(0);
}

function download(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200){
      callback(this.response);
    }
  }
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
}

function upload(group, album, blob, url, src) {
  var formData = new FormData();
  formData.append('file1', blob, 'file.jpg');
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200) {
      var res = (typeof this.response == 'string') ? JSON.parse(this.response) : this.response;

      var params = { album_id: album.id };
      if (group) {
        params.group_id = group.id;
      }
      params.server = res.server;
      params.photos_list = res.photos_list;
      params.hash = res.hash;

      api('photos.save', params, function(data) {
        console.log('saved', data);

        if (data.response) {
          var photo = data.response[0];

          var copied = '';
          if (opts.afterUpload == 'src') {
            copyToClipboard(photo.photo_2560 || photo.photo_1280 || photo.photo_807 || photo.photo_604 || photo.photo_130 || photo.photo_75);
            copied = '\n\nСсылка на изображение скопирована в буфер обмена.';
          } else
          if (opts.afterUpload == 'page') {
            copyToClipboard('http://vk.com/photo' + photo.owner_id + '_' + photo.id);
            copied = '\n\nСсылка на страницу фотографии скопирована в буфер обмена.';
          }

          var notification = window.webkitNotifications.createNotification(
            src,
            'Загрузка завершена',
            'Изображение успешно загружено в альбом «' + album.title + '». Щелкните, чтобы просмотреть.' + copied
          );

          notification.onclick = function () {
            window.open('http://vk.com/photo' + photo.owner_id + '_' + photo.id);
            notification.close();
          }
          notification.show();
          setTimeout(function() {
            notification.cancel();
          }, 3000);
        }
      });
    }
  }
  xhr.open('POST', url);
  xhr.responseType = 'json';
  xhr.send(formData);
}

function copyToClipboard(text) {
  var ta = document.createElement('textarea');
  ta.innerText = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function canvasToBlob(canvas) {
  var url = (typeof canvas == 'string') ? canvas : canvas.toDataURL('image/png');
  var bytes;
  if (url.split(',')[0].indexOf('base64') >= 0) {
    bytes = atob(url.split(',')[1]);
  } else {
    bytes = unescape(url.split(',')[1]);
  }
  var mime = url.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(bytes.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < bytes.length; i++) {
    ia[i] = bytes.charCodeAt(i);
  }

  return {
    url: url,
    blob: new Blob([ab], { type: mime })
  };
}

function api(method, params, callback) {
  var arr = ['v=5.7', 'access_token=' + opts.accessToken];
  for (var k in params) {
    arr.push(k + '=' + escape(params[k]));
  }

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200) {
      var res = (typeof this.response == 'string') ? JSON.parse(this.response) : this.response;
      if (!callback(res) && res.error) {
        var notification = window.webkitNotifications.createNotification(
          'icon-48.png',
          'Ошибка ' + res.error.error_code + ' при выполнении запроса «' + method + '»',
          'Произошла ошибка «' + res.error.error_msg + ' при обращении к API ВКонтакте. Сообщите разработчику.'
        );

        notification.onclick = function () {
          window.open('http://vk.com/write189814');
          notification.close();
        }
        notification.show();
        setTimeout(function() {
          notification.cancel();
        }, 5000);
      }
    }
  }
  xhr.open('POST', 'https://api.vk.com/method/' + method);
  xhr.responseType = 'json';
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.send(arr.join('&'));
}