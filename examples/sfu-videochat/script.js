/* eslint-disable require-jsdoc */
$(function() {
  // Peer object
  const peer = new Peer({
    key:   window.__SKYWAY_KEY__,
    debug: 3,
  });

  let localStream;
  let room;
  peer.on('open', () => {
    $('#my-id').text(peer.id);
    // Get things started
    step1();
  });

  peer.on('error', err => {
    alert(err.message);
    // Return to step 2 if error occurs
    step2();
  });

  $('#make-call').on('submit', e => {
    e.preventDefault();
    // Initiate a call!
    const roomName = $('#join-room').val();
    if (!roomName) {
      return;
    }
    room = peer.joinRoom('sfu_video_' + roomName, {mode: 'mesh', stream: localStream});

    $('#room-id').text(roomName);
    step3(room);
  });

  $('#end-call').on('click', () => {
    room.close();
    step2();
  });

  // Retry if getUserMedia fails
  $('#step1-retry').on('click', () => {
    $('#step1-error').hide();
    step1();
  });

  // set up audio and video input selectors
  const audioSelect = $('#audioSource');
  const videoSelect = $('#videoSource');
  const selectors = [audioSelect, videoSelect];

  navigator.mediaDevices.enumerateDevices()
    .then(deviceInfos => {
      const values = selectors.map(select => select.val() || '');
      selectors.forEach(select => {
        const children = select.children(':first');
        while (children.length) {
          select.remove(children);
        }
      });

      for (let i = 0; i !== deviceInfos.length; ++i) {
        const deviceInfo = deviceInfos[i];
        const option = $('<option>').val(deviceInfo.deviceId);

        if (deviceInfo.kind === 'audioinput') {
          option.text(deviceInfo.label ||
            'Microphone ' + (audioSelect.children().length + 1));
          audioSelect.append(option);
        } else if (deviceInfo.kind === 'videoinput') {
          option.text(deviceInfo.label ||
            'Camera ' + (videoSelect.children().length + 1));
          videoSelect.append(option);
        }
      }

      selectors.forEach((select, selectorIndex) => {
        if (Array.prototype.slice.call(select.children()).some(n => {
          return n.value === values[selectorIndex];
        })) {
          select.val(values[selectorIndex]);
        }
      });

      videoSelect.on('change', step1);
      audioSelect.on('change', step1);
    });

  function step1() {
    // Get audio/video stream
    const audioSource = $('#audioSource').val();
    const videoSource = $('#videoSource').val();
    const constraints = {
      audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
      video: {deviceId: videoSource ? {exact: videoSource} : undefined},
    };

    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      $('#my-video').get(0).srcObject = stream;
      localStream = stream;

      if (room) {
        room.replaceStream(stream);
        return;
      }

      step2();
    }).catch(err => {
      $('#step1-error').show();
      console.error(err);
    });
  }

  function step2() {
    $('#step1, #step3').hide();
    $('#step2').show();
    $('#join-room').focus();
  }

  function step3(room) {
    // Wait for stream on the call, then set peer video display
    room.on('stream', stream => {
      const peerId = stream.peerId;
      const id = 'video_' + peerId + '_' + stream.id.replace('{', '').replace('}', '');

      $('#their-videos').append($(
        '<div class="video_' + peerId +'" id="' + id + '">' +
          '<label>' + stream.peerId + ':' + stream.id + '</label>' +
          '<video class="remoteVideos" autoplay playsinline>' +
        '</div>'));
      const el = $('#' + id).find('video').get(0);
      el.srcObject = stream;
      el.play();
    });

    room.on('removeStream', stream => {
      const peerId = stream.peerId;
      $('#video_' + peerId + '_' + stream.id.replace('{', '').replace('}', '')).remove();
    });

    // UI stuff
    room.on('close', step2);
    room.on('peerLeave', peerId => {
      $('.video_' + peerId).remove();
    });
    $('#step1, #step2').hide();
    $('#step3').show();
  }
  
  var target = document.getElementById("their-videos");
  var btn    = document.getElementById("fullscreenSwitch");
  
  /*フルスクリーン実行用ファンクション*/
  function requestFullscreen() {
    if (target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen(); //Chrome15+, Safari5.1+, Opera15+
    } else if (target.mozRequestFullScreen) {
      target.mozRequestFullScreen(); //FF10+
    } else if (target.msRequestFullscreen) {
      target.msRequestFullscreen(); //IE11+
    } else if (target.requestFullscreen) {
      target.requestFullscreen(); // HTML5 Fullscreen API仕様
    } else {
      alert('ご利用のブラウザはフルスクリーン操作に対応していません');
      return;
    }
    /*フルスクリーン終了用ファンクションボタンに切り替える*/
    btn.onclick = exitFullscreen;
    btn.innerText = "フルスクリーンを終了する";
  }
  /*フルスクリーン終了用ファンクション*/
  function exitFullscreen() {
    if (document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen(); //Chrome15+, Safari5.1+, Opera15+
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen(); //FF10+
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen(); //IE11+
    } else if(document.cancelFullScreen) {
      document.cancelFullScreen(); //Gecko:FullScreenAPI仕様
    } else if(document.exitFullscreen) {
      document.exitFullscreen(); // HTML5 Fullscreen API仕様
    }
    /*フルスクリーン実行用ファンクションボタンに切り替える*/
    btn.onclick = requestFullscreen;
    btn.innerText = "フルスクリーンにする";
  }
  /*サポートしていないIE10以下とスマフォではフルスクリーンボタンを非表示*/
  if(typeof window.orientation != "undefined" || (document.uniqueID && document.documentMode < 11)){
    btn.style.display = "none";
  }
});
