/*global require*/
'use strict';

requirejs.config({
    googlemaps: {
        params: {
            key: 'AIzaSyAhduIkJbVdtRm0Hz6XpkihGt8h_R8cZds',
            libraries: 'geometry'
        }
    },
    baseUrl: 'scripts',
    shim: {
        gmaps: {
            deps: ['googlemaps'],
            exports: "GMaps"
        },
        cryptojs: {
            exports: 'CryptoJS'
        },
        progressbar: {
            exports: 'ProgressBar'
        },
        minEmoji: {
            exports: 'minEmoji'
        },
        "jquery-ui": {
            deps: ['jquery'],
            exports: "$"
        }
    },
    paths: {
        // libs
        googlemaps: '../bower_components/googlemaps-amd/src/googlemaps',
        async: '../bower_components/requirejs-plugins/src/async',
        gmaps: 'https://cdnjs.cloudflare.com/ajax/libs/gmaps.js/0.4.24/gmaps.min',
        cryptojs: '../bower_components/crypto-js-lib/rollups/aes',
        cryptojs_hmac: '../bower_components/crypto-js-lib/rollups/hmac-sha1',
        jquery: '../bower_components/jquery/dist/jquery',
        underscore: '../bower_components/underscore/underscore',
        backbone: '../bower_components/backbone/backbone',
        quickblox: 'https://cdnjs.cloudflare.com/ajax/libs/quickblox/2.5.1/quickblox.min',
        progressbar: '../bower_components/progressbar.js/lib/control/progressbar',
        loadImage: '../bower_components/blueimp-load-image/js/load-image',
        mCustomScrollbar: '../bower_components/malihu-custom-scrollbar-plugin/jquery.mCustomScrollbar',
        "jquery-ui": '../bower_components/jquery-ui/jquery-ui',
        mousewheel: '../bower_components/jquery-mousewheel/jquery.mousewheel',
        timeago: '../bower_components/jquery-timeago/jquery.timeago',
        minEmoji: '../vendor/emoji/js/minEmoji',
        initTelInput: '../vendor/intl-tel-input/js/intlTelInput.min',
        intlTelInputUtils: '../vendor/intl-tel-input/js/utils',
        nicescroll: '../bower_components/jquery.nicescroll/jquery.nicescroll.min',
        perfectscrollbar: '../bower_components/perfect-scrollbar/js/perfect-scrollbar.min',
        QBNotification: '../bower_components/web-notifications/qbNotification',
        lamejs: '../bower_components/lamejs/lame.min',
        QBMediaRecorder: '../bower_components/media-recorder-js/mediaRecorder',
        fingerprint2: '../bower_components/fingerprintjs2/fingerprint2',
        // Denning application
        config: '../configs/main_config',
        MainModule: 'app',
        // models
        UserModule: 'models/user',
        SessionModule: 'models/session',
        SettingsModule: 'models/settings',
        ContactModule: 'models/contact',
        DialogModule: 'models/dialog',
        MessageModule: 'models/message',
        AttachModule: 'models/attach',
        ContactListModule: 'models/contact_list',
        VideoChatModule: 'models/videochat',
        CursorModule: 'models/custom_cursor',
        SyncTabsModule: 'models/sync_tabs',
        VoiceMessage: 'models/voicemessage',
        // views
        UserView: 'views/user',
        SettingsView: 'views/settings',
        DialogView: 'views/dialog',
        MessageView: 'views/message',
        AttachView: 'views/attach',
        ContactListView: 'views/contact_list',
        VideoChatView: 'views/videochat',
        LocationView: 'views/location',
        // apiCalls
        QBApiCalls: 'qbApiCalls',
        DenningApi: 'denningApi',
        // events
        Events: 'events',
        // helpers
        Helpers: 'helpers',
        // custom listeners
        Listeners: 'listeners',
        // templates
        DCHtml: 'dc_html',
        // entities
        Entities: 'entities',
        // DC Player
        DCPlayer: 'views/dc_player'
    }
});

requirejs([
    'jquery',
    'config',
    'minEmoji',
    'MainModule',
    'QBNotification'
], function(
    $,
    DCCONFIG,
    minEmoji,
    DenningChat,
    QBNotification
) {
    var app;

    // Application initialization
    $(function() {

        $.ajaxSetup({cache: true});

        // emoji smiles run
        $('.smiles-group').each(function() {
            var obj = $(this);
            obj.html(minEmoji(obj.text(), true));
        });

        if (DCCONFIG.notification && QBNotification.isSupported()) {
            QBNotification.requestPermission();
        }

        app = new DenningChat();
        app.init();

        window.app = app;
    });
});
