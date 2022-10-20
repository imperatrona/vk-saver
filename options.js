var groups = false;
var groupsByID = {};
var albumsByGroup = {}; // group_id => album list
var albumsByID = {};

function selectGroup(index, group_id) {
  opts.albums[index] = { album: albumsByGroup[group_id] || [] };
  if (group_id) {
    opts.albums[index].group = groupsByID[group_id];
  }
  saveOptions({ albums: opts.albums });
  if (albumsByGroup[group_id]) {
    rebuildSelects();
  } else {
    loadAlbums(group_id);
  }
}

function selectAlbum(index, album_id) {
  var item = opts.albums[index];
  item.album = album_id ? albumsByID[item.group ? item.group.id : 0][album_id] : albumsByGroup[item.group ? item.group.id : 0];
  saveOptions({ albums: opts.albums });
  rebuildSelects();
}

function addAlbum() {
  opts.albums.push({ group: false, album: albumsByGroup[0] || [] });
  saveOptions({ albums: opts.albums });
  rebuildSelects();
}

function deleteAlbum(index) {
  opts.albums.splice(index, 1);
  saveOptions({ albums: opts.albums });
  rebuildSelects();
}

function loadGroups() {
  api('groups.get', { extended: 1 }, function(data) {
    if (data.response) {
      groups = data.response.items;
      groups.sort(function(a, b) {
        if (a.is_admin != b.is_admin) {
          return b.is_admin - a.is_admin;
        } else
        /*if (a.admin_level != b.admin_level) {
          return b.admin_level - a.admin_level;
        } else*/
        if (a.name != b.name) {
          return (a.name < b.name) ? -1 : 1;
        } else {
          return 0;
        }
      });
      for (var i = 0; i < groups.length; i++) {
        groupsByID[groups[i].id] = groups[i];
      }
      rebuildSelects();
    }
  });
}

function loadAlbums(group_id) {
  var params = { extended: 1, need_covers: 1 };
  if (group_id) {
    params.owner_id = -group_id;
  }

  api('photos.getAlbums', params, function(data) {
    var albums = data.response ? data.response.items : [];
    albumsByGroup[group_id || 0] = albums;
    albumsByID[group_id || 0] = {};
    for (var i = 0; i < albums.length; i++) {
      albumsByID[group_id || 0][albums[i].id] = albums[i];
    }

    rebuildSelects();

    for (var i = 0; i < opts.albums.length; i++) {
      if (((opts.albums[i].group ? opts.albums[i].group.id : 0) == (group_id || 0)) && isArray(opts.albums[i].album)) {
        opts.albums[i].album = albums;
      }
    }
    saveOptions({ albums: opts.albums });
    return true;
  });
}

function checkAccessToken() {
  ge('block_auth').style.display = opts.accessToken ? 'none' : 'block';
  ge('block_logged').style.display = opts.accessToken ? 'block' : 'none';
  ge('block_settings').style.display = opts.accessToken ? 'flex' : 'none';

  if (opts.accessToken) {
    loadGroups();

    var loading = {};
    for (var i = 0; i < opts.albums.length; i++) {
      var group_id = opts.albums[i].group ? opts.albums[i].group.id : 0;
      if (!loading[group_id]) {
        loadAlbums(group_id);
        loading[group_id] = true;
      }
    }

    api('users.get', {}, function(data) {
      saveOptions({ userID: data.response[0].id, firstName: data.response[0].first_name, lastName: data.response[0].last_name });

      console.log(opts.userID)
      ge('link_user').href = 'http://vk.com/id' + opts.userID;
      ge('link_user').innerHTML = opts.firstName + ' ' + opts.lastName;
    });
  }
}

function rebuildSelects() {
  var list = [];
  for (var i = 0; i < opts.albums.length; i++) {
    var groupList = [
      '<option value=0' + (opts.albums[i].group ? '' : ' selected') + '>Ваши альбомы</option>',
      '<option value=-1 disabled>— Альбомы' + (groups && groups.length && groups[0].is_admin ? ' администрируемых' : '') + ' групп —</option>'
    ];
    if (groups) {
      for (var j = 0; j < groups.length; j++) {
        groupList.push('<option value=' + groups[j].id + ((opts.albums[i].group && opts.albums[i].group.id == groups[j].id) ? ' selected' : '') + '>' + groups[j].name + '</option>');
        if (j < groups.length - 1 && groups[j].is_admin && !groups[j + 1].is_admin) {
          groupList.push('<option value=-1 disabled>— Альбомы групп —</option>');
        }
      }
    } else
    if (opts.albums[i].group) {
      groupList.push('<option value=' + opts.albums[i].group.id + ' selected>' + opts.albums[i].group.name + '</option>');
    }

    if (!opts.albums[i].album) {
      opts.albums[i].album = [];
    }
    var albumList = [
      '<option value=0' + (isArray(opts.albums[i].album) ? ' selected' : '') + '>Все альбомы (показывать как подменю)</option>',
      '<option value=-1 disabled>— Альбомы —</option>'
    ];
    if (albumsByGroup[opts.albums[i].group ? opts.albums[i].group.id : 0]) {
      var albums = albumsByGroup[opts.albums[i].group ? opts.albums[i].group.id : 0];
      for (var j = 0; j < albums.length; j++) {
        albumList.push('<option value=' + albums[j].id + ((!isArray(opts.albums[i].album) && opts.albums[i].album.id == albums[j].id) ? ' selected' : '') + (opts.albums[i].group && !albums[j].can_upload ? ' disabled' : '') + '>' + albums[j].title + '</option>');
      }
    } else
    if (!isArray(opts.albums[i].album)) {
      albumList.push('<option value=' + opts.albums[i].album.id + ' selected>' + opts.albums[i].album.title + '</option>');
    }

    list.push(`<div class="album-select">` +
              `<div class="select-box">` +
              `<select id="select_group-${i}" class="select_group">${groupList.join('')}</select>` +
              `<select id="select_album-${i}" class="select_album">${albumList.join('')}</select>` +
              `</div>` +
              `<button class=delete id=delete-${i}><svg class=icon fill=none height=24 width=24 xmlns=http://www.w3.org/2000/svg><g stroke-linecap=round stroke-linejoin=round stroke-width=1.5><path d="M20.25 5.25H3.75M9.75 9.75v6M14.25 9.75v6M18.75 5.25V19.5a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75V5.25M15.75 5.25v-1.5a1.5 1.5 0 0 0-1.5-1.5h-4.5a1.5 1.5 0 0 0-1.5 1.5v1.5"/></g></svg></button>` +
              `</div>`)
  }
  ge('albums-block').innerHTML = list.join('');

  for (var i = 0; i < opts.albums.length; i++) {
    (function(i) {
      ge('select_group-' + i).onchange = function(e) {
        selectGroup(i, parseInt(this.value));
      }
      ge('select_album-' + i).onchange = function(e) {
        selectAlbum(i, parseInt(this.value));
      }
      ge('delete-' + i).onclick = function(e) {
        deleteAlbum(i);
        return false;
      }
    })(i);
  }
  ge('link_add').onclick = function(e) {
    addAlbum();
    return false;
  }
}

function performAuth() {
  var redirect_uri = 'https://oauth.vk.com/blank.html';
  var redirect_regex = /^https:\/\/oauth.vk.com\/blank.html#(.*)$/i;
  chrome.windows.getCurrent(function(wnd) {
    chrome.tabs.getCurrent(function(tab) {
      chrome.windows.create({
        url: 'https://oauth.vk.com/authorize?client_id=4139773&scope=photos,groups,offline&redirect_uri=' + redirect_uri + '&display=popup&v=5.110&response_type=token',
        //tabId: tab.id,
        focused: true,
        type: 'popup',
        left: wnd.left + (wnd.width - 700) >> 1,
        top: wnd.top + (wnd.height - 500) >> 1,
        width: 700,
        height: 500,
      }, function(popup) {
        chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
          var match;
          if (tab.windowId == popup.id && changeInfo.url && (match = changeInfo.url.match(redirect_regex))) {
            chrome.windows.remove(popup.id);

            var params = match[1].split('&');
            for (var i = 0; i < params.length; i++) {
              var kv = params[i].split('=');
              if (kv[0] == 'access_token') {
                saveOptions({ accessToken: kv[1] });
                console.log('access_token: ', kv[1]);
                checkAccessToken();
              }
            }
          }
        });
      });
    });
  });
}

function radiobtn(c, onclick) {
  var radio = document.getElementsByClassName(c);
  var handler = function(e) {
    for (var i = 0; i < radio.length; i++) {
      if (radio[i] == this) {
        radio[i].checked = true;
      } else {
        radio[i].checked = false;
      }
    }
    onclick.call(this, e, this.id);
  }
  for (var i = 0; i < radio.length; i++) {
    radio[i].onclick = handler;
  }
}

ge('button_auth').onclick = performAuth;
ge('link_logout').onclick = function() {
  saveOptions({ accessToken: false });
  checkAccessToken();
  return false;
}

function check(id, opt) {
  var ch = ge('check_' + id);
  if (opts[opt]) {
    ch.checked = true;
  }
  ch.onclick = function(e) {
    var update = {};
    update[opt] = this.checked;
    saveOptions(update);
  }
}

check('album', 'showAlbum');
check('tabs', 'showTabs');
check('message', 'showMessage');
check('post', 'showPost');
check('full_post', 'showFullPost');
check("save_source_url", "saveSource");

radiobtn('radio_copy', function(e, id) {
  saveOptions({ afterUpload: ({ radio_copy_none: false, radio_copy_src: 'src', radio_copy_page: 'page' })[id] });
});

switch (opts.afterUpload){
  case 'src':
    ge('radio_copy_src').checked = true;
    break;
  case 'page':
    ge('radio_copy_page').checked = true;
    break;
  default:
    ge('radio_copy_none').checked = true;
}

checkAccessToken();
