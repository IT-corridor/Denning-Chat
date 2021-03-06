/*
 * Denning chat application
 *
 * Events Module
 *
 */
define([
    'jquery',
    'jquery-ui',
    'config',
    'Helpers',
    'DCHtml',
    'LocationView',
    'minEmoji',
    'perfectscrollbar',
    'mCustomScrollbar',
    'mousewheel'
], function(
    $,
    ui,
    DCCONFIG,
    Helpers,
    DCHtml,
    Location,
    minEmoji,
    Ps
) {

    var User,
        Dialog,
        Cursor,
        UserView,
        ContactList,
        ContactListView,
        DialogView,
        MessageView,
        AttachView,
        VideoChatView,
        SettingsView,
        VoiceMessage;

    var chatName,
        editedChatName,
        stopTyping,
        retryTyping,
        keyupSearch;

    var App;

    var $workspace = $('.l-workspace-wrap'),
        $body = $('body');

    function Events(app) {
        App = app;
        this.app = app;

        Dialog = this.app.models.Dialog;
        Cursor = this.app.models.Cursor;
        User = this.app.models.User;
        UserView = this.app.views.User;
        ContactList = this.app.models.ContactList;
        ContactListView = this.app.views.ContactList;
        DialogView = this.app.views.Dialog;
        MessageView = this.app.views.Message;
        AttachView = this.app.views.Attach;
        VideoChatView = this.app.views.VideoChat;
        SettingsView = this.app.views.Settings;
        VoiceMessage = this.app.models.VoiceMessage;
        DenningApi = this.app.denningApi;

        isSearching = false;
    }

    Events.prototype = {

        init: function() {
            window.isDCAppActive = true;

            $(window).focus(function() {
                window.isDCAppActive = true;

                var dialogItem = $('.l-list-wrap section:not(#searchList) .is-selected'),
                    dialog_id = dialogItem[0] && dialogItem.data('dialog');

                if (dialog_id) {
                    dialogItem.find('.unread').text('');
                    DialogView.decUnreadCounter(dialog_id);
                }
            });

            $(window).blur(function() {
                var $chat = $('.l-chat:visible'),
                    $label = $('.l-chat:visible').find('.j-newMessages');

                if ($chat.length && $label.length) {
                    $label.remove();
                }

                window.isDCAppActive = false;
            });

            $(document).on('click', function(event) {
                clickBehaviour(event);
            });

            $('.popups').on('click', function(event) {
                var objDom = $(event.target);

                if (objDom.is('.popups') && !objDom.find('.popup.is-overlay').is('.is-open')) {
                    closePopup();
                }
            });

            $('#signup-avatar:file').on('change', function() {
                changeInputFile($(this));
            });

            /* User Profile
            ----------------------------------------------------- */
            $body.on('click', '.userDetails, .j-userMenu', function(event) {
                removePopover();

                var id = $(this).data('id'),
                    roster = ContactList.roster[id];

                if (roster) {
                    DCHtml.User.getControlButtonsForPopupDetails(roster);
                    openPopup($('#popupDetails'), id);
                    UserView.buildDetails(id);
                } else {
                    removePopover();
                    UserView.occupantPopover($(this), event);
                }

                return false;
            });

            $body.on('click touchstart', '.j-open_sidebar', function(event) {
                $('.l-sidebar').removeClass('active');
                $('.l-sidebar').addClass('active');
            });

            $body.on('click', '#userProfile', function(event) {
                var profileView = App.views.Profile;

                event.preventDefault();
                removePopover();
                profileView.render().openPopup();
            });

            /* smiles
            ----------------------------------------------------- */
            $('.smiles-tab').on('click', function() {
                var $self = $(this),
                    smile = document.querySelector('.smiles-wrap'),
                    group = $self.data('group');

                $self.addClass('is-actived')
                    .siblings().removeClass('is-actived');

                $('.smiles-group_' + group).removeClass('is-hidden')
                    .siblings().addClass('is-hidden');

                smile.scrollTop = 0;
                Ps.update(smile);

                Cursor.setCursorToEnd($('.l-chat:visible .textarea')[0]);
            });

            Ps.initialize(document.querySelector('.smiles-wrap'), {
                wheelSpeed: 1,
                wheelPropagation: true,
                minScrollbarLength: 20
            });

            $workspace.on('click', '.j-em', function() {
                Cursor.setCursorAfterElement($(this)[0]);

                return false;
            });

            $('.j-em_wrap').on('click', function(event) {
                var target = $(this).children()[0],
                    textarea = $('.l-chat:visible .textarea')[0];

                if (target === event.target) {
                    textarea.focus();
                    Cursor.insertElement(target, 'j-em');
                } else {
                    Cursor.setCursorToEnd(textarea);
                }

                return false;
            });

            /* attachments
            ----------------------------------------------------- */
            $workspace.on('click', '.j-btn_input_attach', function() {
                $(this).parents('.l-chat-footer')
                    .find('.attachment')
                    .click();
            });

            $workspace.on('change', '.attachment', function() {
                AttachView.changeInput($(this));
            });

            $workspace.on('click', '.attach-cancel', function(event) {
                event.preventDefault();
                AttachView.cancel($(this));
            });

            $workspace.on('click', '.preview', function() {
                var $self = $(this),
                    name = $self.data('name'),
                    url = $self.data('url'),
                    attachType;

                if ($self.is('.preview-photo')) {
                    attachType = 'photo';
                    setAttachType(attachType);
                } else {
                    attachType = 'video';
                    setAttachType(attachType);
                }

                openAttachPopup($('#popupAttach'), name, url, attachType);
            });

            /* location
            ----------------------------------------------------- */
            $workspace.on('click', '.j-send_location', function() {
                if (localStorage['DC.latitude'] && localStorage['DC.longitude']) {
                    Location.toggleGeoCoordinatesToLocalStorage(false, function(res, err) {
                        Helpers.log(err ? err : res);
                    });
                } else {
                    Location.toggleGeoCoordinatesToLocalStorage(true, function(res, err) {
                        Helpers.log(err ? err : res);
                    });
                }
            });

            $workspace.on('click', '.j-btn_input_location', function() {
                var $self = $(this),
                    $gmap = $('.j-popover_gmap'),
                    bool = $self.is('.is-active');

                removePopover();

                if (!bool) {
                    $self.addClass('is-active');
                    $gmap.addClass('is-active');

                    Location.addMap($gmap);
                }

            });

            $workspace.on('click', '.j-send_map', function() {
                var localData = localStorage['DC.locationAttach'];

                if (localData) {
                    AttachView.sendMessage($('.l-chat:visible'), null, null, localData);
                    localStorage.removeItem('DC.locationAttach');
                    removePopover();
                }
            });

            $workspace.on('click', '.j-btn_file_folder', function() {
                $('.j-file-folder').addClass('is-overlay').parent('.j-overlay').addClass('is-overlay');
            });

            $workspace.on('click', '.j-groupProfile', function(event) {
                event.stopPropagation();
                var $self = $(this),
                    dialog_id = $self.data('dialog'),
                    new_title = editedChatName && editedChatName.name || chatName && chatName.name;

                Helpers.log('add people to groupchat');
                $('.j-group-profile .addToGroupChat').data('ids', $self.data('ids'));
                $('.j-group-profile .addToGroupChat').data('dialog', dialog_id);
                $('.j-group-profile .deleteChat').data('dialog', dialog_id);
                if (new_title)
                    $('.j-group-profile .name_chat').text(new_title);

                ContactListView.openGroupProfile($self, dialog_id);
            });

            $body.on('keypress', function(e) {
                if ((e.keyCode === 13) && $('.j-open_map').length) {
                    $('.j-send_map').click();
                }
            });

            /* user settings
            ----------------------------------------------------- */
            $body.on('click', '#userSettings', function() {
                removePopover();
                $('.j-settings').addClass('is-overlay')
                    .parent('.j-overlay').addClass('is-overlay');

                return false;
            });

            $body.on('click', '.j-close_settings', function() {
                closePopup();

                return false;
            });

            $('.j-toogle_settings').click(function() {
                var $target = $(this).find('.j-setings_notify')[0],
                    obj = {};

                $target.checked = $target.checked === true ? false : true;
                obj[$target.id] = $target.checked;

                SettingsView.update(obj);

                return false;
            });

            /* group chats
            ----------------------------------------------------- */
            $workspace.on('click', '.j-triangle', function() {
                var $chat = $('.l-chat:visible'),
                    $scroll = $chat.find('.j-scrollbar_message');

                if ($chat.find('.triangle_up').is('.is-hidden')) {
                    $scroll.mCustomScrollbar('scrollTo','-=94');
                    setTriagle('up');
                } else {
                    $scroll.mCustomScrollbar('scrollTo','+=94');
                    setTriagle('down');
                }

                return false;
            });

            addToGroupChat = function(event) {
                event.stopPropagation();
                closePopup();
                var $self = $(this),
                    dialog_id = $self.data('dialog');

                Helpers.log('add people to groupchat');
                ContactListView.addContactsToChat($self, 'add', dialog_id);
            };

            $workspace.on('click', '.groupTitle .addToGroupChat', addToGroupChat);
            $('#popupChatProfile').on('click', '.addToGroupChat', addToGroupChat);

            $workspace.on('click', '.groupTitle .leaveChat, .groupTitle .avatar', function(event) {
                event.stopPropagation();
            });

            /* change the chat name
            ----------------------------------------------------- */
            $workspace.on('mouseenter focus', '.groupTitle .name_chat', function() {
                var $chat = $('.l-chat:visible');
                $chat.find('.triangle:visible').addClass('is-hover')
                    .siblings('.pencil').removeClass('is-hidden');

                return false;
            });

            $workspace.on('mouseleave', '.groupTitle .name_chat', function() {
                var $chat = $('.l-chat:visible');

                if (!$(this).is('.is-focus')) {
                    $chat.find('.triangle.is-hover').removeClass('is-hover')
                        .siblings('.pencil').addClass('is-hidden');
                }

                return false;
            });

            $workspace.on('click', '.pencil', function() {
                $('h2.name_chat').text('             ');
            });

            $(document.body).on('click', function() {
                var $chat = $('.l-chat:visible');

                if ($chat.find('.groupTitle .name_chat').is('.is-focus')) {
                    $chat.find('.groupTitle .name_chat').removeClass('is-focus');
                    $chat.find('.groupTitle .name_chat')[0].scrollLeft = 0;
                    $chat.find('.triangle.is-hover').removeClass('is-hover')
                        .siblings('.pencil').addClass('is-hidden');

                    if (editedChatName && !editedChatName.name) {
                        $chat.find('.name_chat').text(chatName.name);
                    } else if (editedChatName && (editedChatName.name !== chatName.name) && (editedChatName.created_at > chatName.created_at)) {
                        $chat.find('.name_chat').text(editedChatName.name).attr('title', editedChatName.name);
                        Dialog.changeName($chat.data('dialog'), editedChatName.name);
                    } else {
                        $chat.find('.name_chat').text($chat.find('.name_chat').text().trim());
                    }
                }
            });

            $body.on('click', '.groupTitle .name_chat', function(event) {
                event.stopPropagation();
                var $self = $(this);
                $self.addClass('is-focus');
                chatName = {
                    name: $self.text().trim(),
                    created_at: Date.now()
                };
                removePopover();
            });

            $body.on('keypress', '.groupTitle .name_chat', function(event) {
                var $self = $(this),
                    code = event.keyCode;

                editedChatName = {
                    name: $self.text().trim(),
                    created_at: Date.now()
                };
                if (code === 13) {
                    $(document.body).click();
                    $self.blur();
                } else if (code === 27) {
                    editedChatName = null;
                    $self.text(chatName.name);
                    $(document.body).click();
                    $self.blur();
                }
            });

            /* change the chat avatar
            ----------------------------------------------------- */
            $body.on('click', '.j-changePic', function() {
                var dialog_id = $(this).data('dialog');

                $('input:file[data-dialog="' + dialog_id + '"]').click();
            });

            $workspace.on('click', '.btn_chat_more', function() {
                $('.btn_chat_extra').toggleClass('is-hidden');
            });

            $workspace.on('change', '.groupTitle .avatar_file', function() {
                var $chat = $('.l-chat:visible');

                Dialog.changeAvatar($chat.data('dialog'), $(this), function(avatar) {
                    if (!avatar) {
                        return false;
                    }

                    $chat.find('.avatar_chat').css('background-image', 'url(' + avatar + ')');
                    $('.j-popupAvatar .j-avatarPic').attr('src', avatar);
                });
            });

            $workspace.on('click', '.j-scaleAvatar', function() {
                Helpers.scaleAvatar($(this));
            });

            /* scrollbars
            ----------------------------------------------------- */
            occupantScrollbar();

            /* welcome page
            ----------------------------------------------------- */
            Events.intiAuthorizationInputs();

            $('.j-login_QB').on('click', function() {
                Helpers.log('login wih QB');

                // removed class "active" (hotfix for input on qmdev.quickblox.com/qm.quickblox.com)
                $('#loginPage .j-prepare_inputs').removeClass('active');
                UserView.loginQB();

                return false;
            });

            $body.on('click', '.care-line', function() {
                $('.new-group').addClass('is-hidden');
                $('.j-sidebar__tab_link').removeClass('active');
                $('.main .filter-item').removeClass('active');
                $('.filter-item:last-child').removeClass('disabled');
                DialogView.showChats(true, 'denning');

                var scrollbar = document.querySelector('.j-scrollbar_aside');
                Ps.update(scrollbar);
            });

            $('.j-sidebar__tab_link').on('click touchstart', function() {
                $('.j-sidebar__tab_link').removeClass('active');
                $(this).addClass('active');

                $('.main .filter-item').removeClass('active');
                $('.main .filter-item:nth-child(2)').addClass('active');

                var tab_type = $('.j-sidebar__tab_link.active').data('type');
                if (tab_type == "contact" || tab_type == "favourite") {
                    $('.main .filter-item:last-child').addClass('disabled');
                }
                // reset search
                $('.localSearch input').val('');
                selectTabFilter();
            });

            $('.filter-item').on('click touchstart', function() {
                if (!$('.j-sidebar__tab_link.active').data('type'))
                    return;

                $(this).siblings().removeClass('active');
                $(this).addClass('active');
            });

            $('.main .filter-item').on('click touchstart', function() {
                selectTabFilter();      // for main filter
            });

            $('.d-file-category .filter-item').on('click touchstart', function() {
                loadFolders();          // for denning file filter
            });

            $('.d-file-type .filter-item').on('click touchstart', function() {
                // for denning file type filter
                filterDenningFiles();
            });

            function selectTabFilter() {
                var tab_type = $('.j-sidebar__tab_link.active').data('type');
                var filter_type = $('.filter-item.active').data('type');

                $('.new-group').addClass('is-hidden');
                $('.l-list-wrap').removeClass('group');

                if (tab_type == "contact") {
                    ContactListView.showContacts(filter_type, '');
                } else if (tab_type == "favourite") {
                    ContactListView.showContacts(filter_type, 'favourite_');
                } else if (tab_type == "chat") {
                    $('.main .filter-item:last-child').removeClass('disabled');
                    DialogView.showChats(false, filter_type);
                } else {
                    $('.main .filter-item:last-child').removeClass('disabled');
                    $('.new-group').removeClass('is-hidden');
                    $('.l-list-wrap').addClass('group');
                    DialogView.showChats(true, filter_type);
                }
                UserView.localSearch($('.localSearch'));

                var scrollbar = document.querySelector('.j-scrollbar_aside');
                Ps.update(scrollbar);
            }

            $('#mainPage').on('click', '.j-lastTimePreview.fav', function() {
                var email = $(this).data('email'),
                    $self = $(this),
                    data = {
                        email: self.app.models.User.contact.email,
                        favourite: email,
                    };

                var param = JSON.stringify(data);
                DenningApi.call('post', 'v1/chat/contact/fav', param, function (users) {
                    $self.toggleClass('favourite');

                    // update denning user info
                    var param = { userid: self.app.models.User.contact.email };
                    DenningApi.call('get', 'v2/chat/contact', param, function (users) {
                        ContactList.addDenningUsers(users, true);
                    });
                });
            });

            $('.list_contextmenu').on('dblclick', '.contact.user', function() {
                var id = $(this).parent().data('id'),
                    tab_type = $('.j-sidebar__tab_link.active').data('type'),
                    filter_type = $('.filter-item.active').data('type');

                if (tab_type != 'chat') {
                    $('.main .filter-item').removeClass('active');
                    $('.main .filter-item:first-child').addClass('active');
                    $('.j-sidebar__tab_link:first').click();
                } else if (filter_type != 'contact') {
                    $('.main .filter-item:first-child').click();
                }

                selectOrCreateChat(id);
            });

            $('#mainPage').on('click', '.createGroupChat', function(event) {
                event.preventDefault();

                Helpers.log('add people to groupchat');

                var $self = $(this),
                    isPrivate = $self.data('private');

                ContactListView.addContactsToChat($self, null, null, isPrivate);
            });

            /* button "back"
            ----------------------------------------------------- */
            $('.j-back_to_login_page').on('click', function() {
                UserView.loginQB();
                $('.j-success_callback').remove();
            });

            /* login page
            ----------------------------------------------------- */
           
            $('#loginForm').on('click submit', function(event) {
                Helpers.log('authorize user');
                event.preventDefault();
                UserView.loginForm();
            });

            /* popovers
            ----------------------------------------------------- */
            $('#avatar-container').on('click', function(event) {
                event.preventDefault();
                removePopover();
                if ($('.l-chat:visible').find('.triangle_down').is('.is-hidden')) {
                    setTriagle('down');
                }
                UserView.profilePopover($(this));
            });

            $('.list_contextmenu').on('contextmenu', '.contact', function(event) {
                removePopover();
                UserView.contactPopover($(this));

                return false;
            });

            $workspace.on('click', '.occupant', function(event) {
                removePopover();
                UserView.occupantPopover($(this), event);

                return false;
            });

            $workspace.on('click', '.j-btn_input_smile', function() {
                var $self = $(this),
                    bool = $self.is('.is-active');

                removePopover();

                if (!bool) {
                    $self.addClass('is-active');
                    $('.j-popover_smile').addClass('is-active');
                }

                Cursor.setCursorToEnd($('.l-chat:visible .textarea')[0]);
            });

            $workspace.on('click', '.j-btn_audio_record', function() {
                var $self = $(this),
                    bool = $self.is('.is-active');

                removePopover();

                if (!bool) {
                    $self.addClass('is-active');
                    $('.j-popover_record').addClass('is-active');
                }
            });

            /* popups
            ----------------------------------------------------- */
            $body.on('click', '#logout', function(event) {
                event.preventDefault();
                openPopup($('#popupLogout'));
            });

            // delete contact
            $body.on('click', '.j-deleteContact', function() {
                closePopup();

                var $that = $(this),
                    parents = $that.parents('.presence-listener'),
                    id = parents.data('id') || $that.data('id');

                if (parents.is('.popup_details')) {
                    openPopup($('.j-popupDeleteContact'), id, null, true);
                } else {
                    openPopup($('.j-popupDeleteContact'), id);
                }

                return false;
            });

            $('.j-deleteContactConfirm').on('click', function() {
                var id = $(this).parents('.j-popupDeleteContact').data('id');

                ContactListView.sendDelete(id, true);
                Helpers.log('delete contact');
            });

            // delete chat
            $('.list, .l-workspace-wrap').on('click', '.j-deleteChat', function() {
                closePopup();

                var $self = $(this),
                    parent = $self.parents('.presence-listener')[0] ? $self.parents('.presence-listener') : $self.parents('.is-group'),
                    dialog_id = parent.data('dialog');

                openPopup($('.j-popupDeleteChat'), null, dialog_id);

                return false;
            });

            $('#popupChatProfile').on('click', '.j-deleteChat', function() {
                closePopup();

                var $self = $(this),
                    dialog_id = $self.data('dialog');

                openPopup($('.j-popupDeleteChat'), null, dialog_id);

                return false;
            });

            $('#popupChatProfile').on('click', '.j-saveProfile', function() {
                var dialog_id = $('.j-group-profile .deleteChat').data('dialog'),
                    tag = $('.j-group-profile .chat-category select').val(),
                    position = $('#chatPosition input').val(),
                    notifications = $('#group_notify').prop('checked') ? 1 : 0,
                    role_denning = [0],
                    role_admin = [0],
                    role_normal = [0],
                    role_reader = [0];

                // get roles
                $('.member_role').each(function() {
                    var role = $(this).val(),
                        id = $(this).data('id');

                    if (role == 'denning')
                        role_denning.push(id);
                    else if (role == 'admin')
                        role_admin.push(id);
                    else if (role == 'staff')
                        role_normal.push(id);
                    else 
                        role_reader.push(id);
                });

                Dialog.updateProfile(dialog_id, {
                    class_name: "dialog_data",
                    tag: tag,
                    position: position,
                    notifications: notifications,
                    role_denning: role_denning,
                    role_admin: role_admin,
                    role_normal: role_normal,
                    role_reader: role_reader
                }, function() { 
                    alert('Profile is saved successfully.');
                    closePopup();
                });
            });

            $('.j-deleteChatConfirm').on('click', function() {
                Helpers.log('Delete chat');
                DialogView.deleteChat($(this));
            });

            $('#logoutConfirm').on('click', function() {
                localStorage.setItem('DC.' + User.contact.id + '_logOut', true);
                UserView.logout();
            });

            $('.popup-control-button, .btn_popup_private').on('click', function(event) {
                event.preventDefault();

                var $self = $(this),
                    isProfile = $self.data('isprofile');

                if (!$self.is('.returnBackToPopup')) {
                    closePopup();
                }

                if (isProfile) {
                    openPopup($('#popupDetails'));
                }
            });

            $('.search').on('click', function() {
                Helpers.log('global search');
                closePopup();
                ContactListView.globalPopup();
            });

            $('.btn_search').on('click', function(event) {
                event.preventDefault();

                var localSearch = $('#searchContacts input'),
                    globalSearch = $('#globalSearch input');

                globalSearch.val(localSearch.val());
                $('#globalSearch').submit();
            });

            $('.l-sidebar').on('click', '.addToGroupChat', function(event) {
                event.preventDefault();

                var $self = $(this),
                    dialog_id = $self.data('dialog');
                Helpers.log('add people to groupchat');
                ContactListView.addContactsToChat($self, 'add', dialog_id);
            });

            /* file folder search
            ----------------------------------------------------- */   
            var keyword_folder;

            var loadFolders = function() {
                var $self = $( ".j-fileSearch" );

                if ($('.list_matters').is('.mCS-autoHide')) {
                    $('.list_matters').mCustomScrollbar("destroy");
                }

                $self.find('.j-clean-button').show();
                $self.parent().find('.list_matters').html('<li style="padding: 12px; font-weight: 600; font-size: 17px;">Searching...</li>');

                var param = {
                        search: keyword_folder,
                        category: $('.j-file-folder .filter-item.active').data('category'),
                        isAutoComplete: 1
                    };

                DenningApi.call('get', 'v1/generalSearch', param, function (res) {
                    if (res.length == 0) {
                        $self.parent().find('.list_matters').html('<li style="padding: 12px; font-weight: 500; font-size: 16px;">There is no result.</li>');
                    } else {
                        $self.parent().find('.list_matters').html('');

                        _.each(res, function(ii) {
                            var el = Helpers.fillTemplate('tpl_matter', { matter: ii});
                            $self.parent().find('.list_matters').append(Helpers.toHtml(el)[0]);
                        });
                    }
                    $('.list_matters').mCustomScrollbar({ theme: 'minimal-dark' });
                });
            };

            $( ".j-fileSearch .form-input-search" ).autocomplete({
                source: function (request, response) {
                    var param = { search: request.term };
                    DenningApi.call('get', 'v1/generalSearch/keyword', param, function (data) {
                        response($.map( data, function(item) {
                            return item.keyword;
                        }));
                    });
                },
                minLength: 2,
                select: function( event, ui ) {
                    keyword_folder = ui.item.value;
                    loadFolders();
                }
            });

            $('.list_matters').on('click', '.list-item-matter', function() {
                var key = $(this).data('key'),
                    type = $(this).data('type').toLowerCase();
                Helpers.View.hide('.list-item-matter');
                Helpers.View.hide('.j-fileSearch');
                Helpers.View.hide('.d-file-category');
                Helpers.View.show('#popupFileFolder button.btn');
                Helpers.View.show('.j-ifileSearch');
                Helpers.View.show('.d-file-type');

                $('.j-ifileSearch .form-input-search').val('');
                $('.filename').text($(this).find('.matter_title').text().replace("Matter: ", ""));

                DenningApi.call('get', 'v1/document/'+type+'/dir/'+key, {}, function (res) {
                    $('.list_matters').mCustomScrollbar("destroy");
                    if (!res || res.documents.length == 0) {
                        if (!$('.list_matters').find('.no-matter-file').length) 
                            $('.list_matters').append('<li class="no-matter-file" style="padding: 12px; font-weight: 500; font-size: 16px;">There is no file.</li>');                        
                        $('.list_matters').find('.no-matter-file').removeClass('is-hidden');
                    } else {
                        var el = Helpers.fillTemplate('tpl_matter_folder', { folder: { name: "FILES" }});
                        $('.list_matters').append(Helpers.toHtml(el)[0]);

                        _.each(res.documents, function(ii) {
                            var el = Helpers.fillTemplate('tpl_matter_file', { file: ii});
                            $('.list_matters').append(Helpers.toHtml(el)[0]);
                        });

                        _.each(res.folders, function(ii) {
                            var el = Helpers.fillTemplate('tpl_matter_folder', { folder: { name: ii.name.toUpperCase() }});
                            $('.list_matters').append(Helpers.toHtml(el)[0]);

                            _.each(ii.documents, function(jj) {
                                var el = Helpers.fillTemplate('tpl_matter_file', { file: jj});
                                $('.list_matters').append(Helpers.toHtml(el)[0]);
                            });
                        });

                    }
                    $('.list_matters').mCustomScrollbar({ theme: 'minimal-dark' });
                });
            });

            $('#popupFileFolder button.back').on('click', function() {
                Helpers.View.hide('#popupFileFolder button.btn');
                Helpers.View.hide('.j-ifileSearch');
                Helpers.View.hide('.no-matter-file');
                Helpers.View.hide('.d-file-type');
                Helpers.View.show('.j-fileSearch');
                Helpers.View.show('.list-item-matter');
                Helpers.View.show('.d-file-category');

                $('.list-item-file').remove();
                $('.filename').text('Search Denning Folders');
            });

            $('.j-close-button').on('click', function() {
                closePopup();
            });

            $('#popupFileFolder').on('click', '.send-denning-files', function() {
                var choosenFiles = $("input.file-choose:checked");
                if (choosenFiles.length > 0) {
                    var jid = $('.j-btn_file_folder').parents('.l-chat').data('jid'),
                        dialog_id = $('.j-btn_file_folder').parents('.l-chat').data('dialog'),
                        type = $('.j-btn_file_folder').parents('.l-chat').is('.is-group') ? 'groupchat' : 'chat';

                    for (var i = 0; i < choosenFiles.length; i++) {
                        var _file = $(choosenFiles[i]).parents('.list-item-file'),
                            val = 'Denning File Attachment: ' + _file.data('title') + _file.data('ext'),
                            dext = {
                                url: _file.data('url'),
                                title: _file.data('title'),
                                ext: _file.data('ext'),
                                size: _file.data('size') * 1000
                            };
                        MessageView._sendMessage(jid, val, type, dialog_id, dext);
                    }
                    closePopup();

                    // reset file select dialog
                    $('#popupFileFolder button.back').click();
                    $('.j-fileSearch .j-clean-button').click();
                }
            });
            
            $('#chatWrap').on('click', '.denning-attachment', function() {
                var file = {
                    URL: $(this).data('url'),
                    ext: $(this).data('ext'),
                    name: $(this).data('name'),
                };

                if (parent.preview) {   // embedded in online
                    parent.preview(file);
                } else {
                    $('#popupPreviewFile').addClass('is-overlay').parent('.j-overlay').addClass('is-overlay');

                    DenningApi.call('get', file.URL.replace('/document/', '/getOneTimeLink/'), {}, function (data) {
                        var url = 'https://docs.google.com/gview?url=https://denningchat.com.my/denningwcf/' +
                                  data + '&embedded=true',
                            openFiles = ['.jpg', '.png', '.jpeg'];

                        if (openFiles.indexOf(file.ext) > -1) {
                          url = 'https://denningchat.com.my/denningwcf/' + data;
                        }

                        $('#popupPreviewFile .modal-title').text(file.name+file.ext);
                        $('#popupPreviewFile iframe').attr('src', url);
                    });
                }
            });
            /* search
            ----------------------------------------------------- */
            $('.j-globalSearch').on('keyup search submit', function(event) {
                var $self = $(this),
                    code = event.keyCode,
                    isText = $self.find('.form-input-search').val().length,
                    $cleanButton = $self.find('.j-clean-button'),
                    isNoBtn = $cleanButton.is(':hidden');

                if (code === 13) {
                    clearTimeout(keyupSearch);
                    startSearch();
                } else if (keyupSearch === undefined) {
                    keyupSearch = setTimeout(function() {
                        startSearch();
                    }, (code === 8) ? 0 : 1000);
                } else {
                    clearTimeout(keyupSearch);
                    keyupSearch = setTimeout(function() {
                        startSearch();
                    }, 1000);
                }

                function startSearch() {
                    keyupSearch = undefined;
                    ContactListView.globalSearch($self);
                }

                if (isText && isNoBtn) {
                    $cleanButton.show();
                } else if (!isText) {
                    $cleanButton.hide();
                }

                return false;
            });

            $('.localSearch').on('keyup search submit', function(event) {
                var $self = $(this),
                    scrollbar = document.querySelector('.j-scrollbar_aside'),
                    isText = $self.find('.form-input-search').val().length,
                    $cleanButton = $self.find('.j-clean-button'),
                    isNoBtn = $cleanButton.is(':hidden'),
                    type = event.type,
                    code = event.keyCode; // code=27 (Esc key), code=13 (Enter key)

                if ((type === 'keyup' && code !== 27 && code !== 13) || (type === 'search')) {
                    if (this.id === 'searchContacts') {
                        UserView.localSearch($self);
                    } else if (this.id === 'docSearch') {
                        filterDenningFiles();
                    } else {
                        UserView.friendsSearch($self);
                    }

                    Ps.update(scrollbar);
                }

                if (isText && isNoBtn) {
                    $cleanButton.show();
                } else if (!isText) {
                    $cleanButton.hide();
                }

                return false;
            });

            $('.j-clean-button').on('click', function(event) {
                var $self = $(this),
                    $form = $self.parent('.formSearch');

                $self.hide();
                $form.find('input.form-input-search').val('').focus();

                if ($form.is('.j-globalSearch')) {
                    ContactListView.globalSearch($form);
                } else if ($form.is('.j-localSearch')) {
                    UserView.localSearch($form);
                } else if ($form.is('.j-fileSearch')) {
                    if ($('.list_matters').is('.mCS-autoHide')) {
                        $('.list_matters').mCustomScrollbar("destroy");
                    }
                    $('.list_matters').html('');
                    $('.doc-search').val('');
                    $('.filename').html('Search Denning Folders');
                } else {
                    UserView.friendsSearch($form);
                }

                return false;
            });

            /* subscriptions
            ----------------------------------------------------- */
            $('.list_contacts').on('click', '.j-sendRequest', function() {
                var jid = $(this).parents('.j-listItem').data('jid');

                ContactListView.sendSubscribe(jid);
                Helpers.log('send subscribe');
            });

            $workspace.on('click', '.j-requestAgain', function() {
                var jid = $(this).parents('.j-chatItem').data('jid');

                ContactListView.sendSubscribe(jid, true);
                Helpers.log('send subscribe');
            });

            $body.on('click', '.j-requestAction', function() {
                var jid = $(this).parents('.j-listItem').data('jid');

                ContactListView.sendSubscribe(jid);
                Helpers.log('send subscribe');
            });

            $('.list').on('click', '.j-requestConfirm', function() {
                var jid = $(this).parents('.j-incomingContactRequest').data('jid');

                ContactListView.sendConfirm(jid, true);
                Helpers.log('send confirm');
            });

            $('.list').on('click', '.j-requestCancel', function() {
                var jid = $(this).parents('.j-incomingContactRequest').data('jid');

                ContactListView.sendReject(jid, true);
                Helpers.log('send reject');
            });

            /* dialogs
            ----------------------------------------------------- */
            $('.list').on('click', '.contact.dialog', function(event) {
                if (event.target.tagName !== 'INPUT') {
                    event.preventDefault();
                    $('.l-sidebar').removeClass('active');
                }
            });

            $('#popupContacts').on('click', '.contact', function() {
                var obj = $(this).parent(),
                    popup = obj.parents('.popup'),
                    len;

                if (obj.is('.is-chosen')) {
                    obj.removeClass('is-chosen').find('input').prop('checked', false);
                } else {
                    obj.addClass('is-chosen').find('input').prop('checked', true);
                }

                len = obj.parent().find('li.is-chosen').length;
                if (len === 1 && !popup.is('.is-addition')) {
                    popup.removeClass('not-selected');
                    popup.find('.btn_popup_private').removeClass('is-hidden').siblings().addClass('is-hidden');

                    if (obj.is('li:last')) {
                        popup.find('.list_contacts').mCustomScrollbar("scrollTo", "bottom");
                    }
                } else if (len >= 1) {
                    popup.removeClass('not-selected');

                    if (popup.is('.add')) {
                        popup.find('.btn_popup_add').removeClass('is-hidden').siblings().addClass('is-hidden');
                    } else {
                        popup.find('.btn_popup_group').removeClass('is-hidden').siblings().addClass('is-hidden');
                    }

                    if (obj.is('li:last')) {
                        popup.find('.list_contacts').mCustomScrollbar("scrollTo", "bottom");
                    }
                } else {
                    popup.addClass('not-selected');
                }
            });

            $('#popupContacts .btn_popup_private').on('click', function() {
                var id = $('#popupContacts .is-chosen').data('id');
                selectOrCreateChat(id);
            });

            function selectOrCreateChat(id) {
                var dialogItem = $('.j-dialogItem[data-id="' + id + '"]').find('.contact');

                if (dialogItem.length) {
                    dialogItem.click();
                } else {
                    Dialog.restorePrivateDialog(id, function() {
                        ContactListView.importFBFriend(id);
                        dialogItem = $('.j-dialogItem[data-id="' + id + '"]').find('.contact');
                        dialogItem.click();
                    });
                }

            }

            $body.on('click', '.writeMessage', function(event) {
                event.preventDefault();

                var id = $(this).data('id'),
                    dialogItem = $('.j-dialogItem[data-id="' + id + '"]').find('.contact');

                closePopup();

                if (dialogItem.length) {
                    dialogItem.click();
                } else {
                    Dialog.restorePrivateDialog(id, function() {
                        dialogItem = $('.j-dialogItem[data-id="' + id + '"]').find('.contact');
                        dialogItem.click();
                    });
                }
            });

            $('#popupContacts .btn_popup_group').on('click', function() {
                DialogView.createGroupChat();
            });

            $('#popupContacts .btn_popup_add').on('click', function() {
                var dialog_id = $(this).parents('.popup').data('dialog');
                DialogView.createGroupChat('add', dialog_id);
            });

            $workspace.on('click', '.j-btn_input_send', function() {
                var $msg = $('.j-message:visible'),
                    isLoading = $('.j-loading').length;

                if (!isLoading) {
                    MessageView.sendMessage($msg);
                    $msg.find('.textarea').empty();
                }

                removePopover();

                Cursor.setCursorToEnd($('.l-chat:visible .textarea')[0]);

                return false;
            });

            // show message status on hover event
            $body.on('mouseenter', 'article.message.is-own', function() {
                var $self = $(this),
                    time = $self.find('.message-time'),
                    status = $self.find('.message-status');

                time.addClass('is-hidden');
                status.removeClass('is-hidden');
            });

            $body.on('mouseleave', 'article.message.is-own', function() {
                var $self = $(this),
                    time = $self.find('.message-time'),
                    status = $self.find('.message-status');

                status.addClass('is-hidden');
                time.removeClass('is-hidden');
            });

            /* A button for the scroll to the bottom of chat
            ------------------------------------------------------ */
            $body.on('click', '.j-refreshButton', function() {
                var $this = $(this),
                    dialogId = $this.data('dialog');

                if (dialogId.length) {
                    DialogView.htmlBuild(dialogId);
                } else {
                    DialogView.downloadDialogs();
                }

                $this.remove();

                return false;
            });
            
            $workspace.on('click', '.j-toBottom', function() {
                $('.j-scrollbar_message').mCustomScrollbar('scrollTo', 'bottom');
                $(this).hide();
            });

            $workspace.on('click', '.j-videoPlayer', function(e) {
                var video = e.target;

                if (!video.dataset.source) return false;

                video.src = video.dataset.source;
                video.preload = 'metadata';
                video.poster = 'images/video_loader.gif';

                video.addEventListener('loadeddata', isReady);

                function isReady() {
                    delete this.dataset.source;
                    this.removeEventListener('loadeddata', isReady);

                    this.poster = '';
                    this.controls = true;
                    this.autoplay = true;
                    this.load();
                }
            });

            // send typing statuses with keyup event
            $workspace.on('keypress', '.j-message', function(event) {
                var $self = $(this),
                    isEnterKey = (event.keyCode === 13),
                    shiftKey = event.shiftKey,
                    $chat = $self.parents('.l-chat'),
                    jid = $chat.data('jid'),
                    isLoading = $chat.find('.j-loading').length,
                    isEmpty = !$chat.find('.textarea').html().length;

                if (isEnterKey && (isLoading || isEmpty)) {
                    return false;
                } else if (isEnterKey && !shiftKey) {
                    isStopTyping();
                    MessageView.sendMessage($self);
                    $self.find('.textarea').empty();
                    removePopover();
                    return false;
                } else if (stopTyping === undefined) {
                    isStartTyping();
                    stopTyping = setTimeout(isStopTyping, 4000);
                    retryTyping = setInterval(isStartTyping, 4000);
                } else {
                    clearTimeout(stopTyping);
                    stopTyping = setTimeout(isStopTyping, 4000);
                }

                function isStartTyping() {
                    MessageView.sendTypingStatus(jid, true);
                }

                function isStopTyping() {
                    clearTimeout(stopTyping);
                    stopTyping = undefined;

                    clearInterval(retryTyping);
                    retryTyping = undefined;

                    MessageView.sendTypingStatus(jid, false);
                }
            });

            $(document).on('keypress', function(event) {
                if ( event.keyCode === 13 && $('.j-popover_record').hasClass('is-active') ) {
                    $('.j-record_title').click();
                }
            });

            $workspace.on('click', '.j-message', function() {
                if ( $('.j-popover_record').hasClass('is-active') ) {
                    removePopover();
                }
            });

            $workspace.on('submit', '.j-message', function() {
                return false;
            });

            $workspace.on('keypress', '.j-message', function() {
                var $textarea = $('.l-chat:visible .textarea'),
                    $emj = $textarea.find('.j-em'),
                    val = $textarea.text().trim();

                if (val.length || $emj.length) {
                    $textarea.addClass('contenteditable');
                } else {
                    $textarea.html(' ');
                    Cursor.setCursorToEnd($textarea[0]);
                }
            });

            $body.on('paste', '.j-message', function(e) {
                var text = (e.originalEvent || e).clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);

                return false;
            });

            $('.j-home').on('click', function() {
                var $selected = $('.is-selected'),
                    dialogId = $selected.data('dialog'),
                    $label = $('.j-newMessages[data-dialog="' + dialogId + '"]');

                VoiceMessage.resetRecord();

                $('.j-capBox').removeClass('is-hidden')
                    .siblings().removeClass('is-active');
                $('.j-chatWrap').addClass('is-hidden');

                if ($label.length) {
                    $label.remove();
                }

                $selected.removeClass('is-selected');

                return false;
            });

            /* temporary events
            ----------------------------------------------------- */
            $('#share').on('click', function(event) {
                event.preventDefault();
            });

            // videocalls
            VideoChatView.init();
        }
    };

    Events.intiAuthorizationInputs = function(el) {
        $input = el ? el : $('.form-input');

        $input.on('focus', function() {
            var $this = $(this);

            if (!$this.val()) {
                $this.next('label').addClass('active');
            }

            return false;
        });

        $input.on('blur', function() {
            var $this = $(this);

            if (!$this.val()) {
                $this.next('label').removeClass('active');
            }

            return false;
        });
    };

    /* Private
    ---------------------------------------------------------------------- */
    function occupantScrollbar() {
        $('.chat-occupants, #popupIncoming').mCustomScrollbar({
            theme: 'minimal-dark',
            scrollInertia: 500,
            mouseWheel: {
                scrollAmount: 'auto',
                deltaFactor: 'auto'
            },
            live: true
        });
    }

    // Checking if the target is not an object run popover
    function clickBehaviour(e) {
        var objDom = $(e.target),
            selectors = '#avatar-container, #profile *, .occupant, .occupant *, ' +
                '.j-btn_input_smile, .j-btn_input_smile *, .textarea, ' +
                '.textarea *, .j-popover_smile, .j-popover_smile *, ' +
                '.j-popover_gmap, .j-popover_gmap *, .j-btn_input_location, ' +
                '.j-btn_input_location *, ' +
                '.j-popover_record, .j-popover_record *, .j-btn_audio_record, ' +
                '.j-btn_audio_record *',
            googleImage = objDom.context.src && objDom.context.src.indexOf('/maps.gstatic.com/mapfiles/api-3/images/mapcnt6.png') || null;

        if (objDom.is(selectors) || e.which === 3 || googleImage === 7) {
            return false;
        } else {
            removePopover();
        }
    }

    function changeInputFile(objDom) {
        var URL = window.URL,
            file = objDom[0].files[0],
            src = file ? URL.createObjectURL(file) : DCCONFIG.defAvatar.url,
            fileName = file ? file.name : DCCONFIG.defAvatar.caption;

        objDom.prev().find('.avatar').css('background-image', "url(" + src + ")").siblings('span').text(fileName);
    }

    function removePopover() {
        var $openMap = $('.j-open_map');

        $('.is-contextmenu').removeClass('is-contextmenu');
        $('.popover').remove();

        if ( $('.j-start_record').hasClass('is-active') ||
             $('.j-start_record').hasClass('is-send') ) {
            return false;
        }

        $('.is-active').removeClass('is-active');

        if ($openMap.length) {
            $openMap.remove();
        }
    }

    function openPopup(objDom, id, dialog_id, isProfile) {
        // if it was the delete action
        if (id) {
            objDom.data('id', id);
            objDom.find('.j-deleteContactConfirm').data('id', id);
        }
        if (dialog_id) {
            objDom.find('.j-deleteChatConfirm').data('dialog', dialog_id);
        }
        if (isProfile) {
            objDom.find('.popup-control-button_cancel').attr('data-isprofile', true);
        }
        objDom.add('.popups').addClass('is-overlay');
    }

    function openAttachPopup(objDom, name, url, attachType) {
        if (attachType === 'video') {
            objDom.find('video.attach-video').attr('src', url);
        } else {
            objDom.find('.attach-photo').attr('src', url);
        }

        objDom.find('.attach-name').text(name);
        objDom.find('.attach-download').attr('href', url).attr('download', name);
        objDom.add('.popups').addClass('is-overlay');
    }

    function closePopup() {
        $('.j-popupDeleteContact.is-overlay').removeData('id');
        $('.j-popupDelete.is-overlay').removeData('id');
        $('.is-overlay:not(.chat-occupants-wrap)').removeClass('is-overlay');
        $('.temp-box').remove();

        if ($('video.attach-video')[0]) {
            $('video.attach-video')[0].pause();
        }

        if ($('img.attach-photo')[0]) {
            $('img.attach-photo').attr('src', 'images/photo_preloader.gif');
        }
    }

    function setAttachType(type) {
        var otherType = type === 'photo' ? 'video' : 'photo';

        $('.attach-' + type).removeClass('is-hidden')
            .siblings('.attach-' + otherType).addClass('is-hidden');
    }

    function setTriagle(UpOrDown) {
        var $chat = $('.l-chat:visible'),
            $triangle = $chat.find('.triangle_' + UpOrDown);

        $triangle.removeClass('is-hidden')
            .siblings('.triangle').addClass('is-hidden');

        $chat.find('.chat-occupants-wrap').toggleClass('is-overlay');
        $chat.find('.l-chat-content').toggleClass('l-chat-content_min');
    }

    function filterDenningFiles() {
        var ext = $('.d-file-type .filter-item.active').data('ext').toLowerCase(),
            keyword = $('#docSearch input').val().toUpperCase();

        $('.list_matters').find('.list-item-file').each(function() {
            var ext_ = $(this).data('ext').toLowerCase(),
                name_ = $(this).find('.matter_title').text().toLowerCase()+$(this).find('.file_title').text().toLowerCase();

            if ((ext == '*' || ext.indexOf(ext_) > -1) && (name_.indexOf(keyword) > -1)) {
                $(this).removeClass('is-hidden');
            } else {
                $(this).addClass('is-hidden');
            }
        });
    }

    return Events;
});
