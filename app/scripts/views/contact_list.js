/*
 * Denning chat application
 *
 * Contact List View Module
 *
 */
define([
    'jquery',
    'config',
    'quickblox',
    'Entities',
    'Helpers',
    'DCHtml',
    'underscore',
    'mCustomScrollbar',
    'mousewheel'
], function(
    $,
    DCCONFIG,
    QB,
    Entities,
    Helpers,
    DCHtml,
    _
) {
    var self;

    var Dialog,
        Message,
        ContactList,
        User;

    function ContactListView(app) {
        this.app = app;
        Dialog = this.app.models.Dialog;
        Message = this.app.models.Message;
        ContactList = this.app.models.ContactList;
        User = this.app.models.User;
        self = this;

        scrollbarContacts();
    }

    ContactListView.prototype = {

        createDataSpinner: function(list) {
            this.removeDataSpinner();

            var spinnerBlock = '<div class="popup-elem spinner_bounce">';
                spinnerBlock += '<div class="spinner_bounce-bounce1"></div>';
                spinnerBlock += '<div class="spinner_bounce-bounce2"></div>';
                spinnerBlock += '<div class="spinner_bounce-bounce3"></div>';
                spinnerBlock += '</div>';

            list.after(spinnerBlock);
        },

        removeDataSpinner: function() {
            $('.popup:visible .spinner_bounce').remove();
            $('.popup:visible input').prop('disabled', false);
        },

        globalPopup: function() {
            var popup = $('#popupSearch');

            openPopup(popup);
            popup.find('.popup-elem')
                 .addClass('is-hidden')
                 .siblings('form')
                 .find('input')
                 .val('');
            popup.find('.mCSB_container').empty();
        },

        globalSearch: function($form) {
            var self = this,
                $popup = $form.parent(),
                $list = $popup.find('ul:first.list_contacts'),
                $firstNote = $popup.find('.j-start_search_note'),
                val = $form.find('input[type="search"]').val().trim(),
                len = val.length;

            if (len > 0) {
                $firstNote.addClass('is-hidden');
                // display "Name must be more than 2 characters" or "No results found"
                if (len < 3) {
                    $popup.find('.popup-elem .not_found').addClass('is-hidden');
                    $popup.find('.popup-elem .short_length').removeClass('is-hidden');
                } else {
                    $popup.find('.popup-elem .not_found').removeClass('is-hidden');
                    $popup.find('.popup-elem .short_length').addClass('is-hidden');
                }

                scrollbar($list, self);
                self.createDataSpinner($list);

                sessionStorage.setItem('DC.search.value', val);
                sessionStorage.setItem('DC.search.page', 1);

                ContactList.globalSearch(function(results) {
                    createListResults($list, results, self);
                });
            } else {
                $firstNote.removeClass('is-hidden');
            }

            $form.find('input').prop('disabled', false).val(val);
            $popup.find('.popup-elem').addClass('is-hidden');
            $popup.find('.mCSB_container').empty();

            $('.popup:visible .spinner_bounce')
                .removeClass('is-hidden')
                .addClass('is-empty');
        },

        addContactsToChat: function(objDom, type, dialog_id, isPrivate) {
            var ids = objDom.data('ids') ? objDom.data('ids').toString().split(',') : [],
                popup = $('#popupContacts'),
                contacts = ContactList.contacts,
                roster = ContactList.roster,
                sortedContacts,
                existing_ids,
                user_id,
                friends,
                html;

            openPopup(popup, type, dialog_id);
            popup.addClass('not-selected').removeClass('is-addition');
            popup.find('.note').addClass('is-hidden').siblings('ul').removeClass('is-hidden');
            popup.find('.popup-nofriends').addClass('is-hidden').siblings().removeClass('is-hidden');
            popup.find('form')[0].reset();
            popup.find('.list_contacts').mCustomScrollbar("scrollTo", "top");
            popup.find('.mCSB_container').empty();
            popup.find('.btn').removeClass('is-hidden');

            // get your friends which are sorted by alphabet
            sortedContacts = _.pluck(_.sortBy(contacts, function(user) {
                if (user.full_name) {
                    return user.full_name.toLowerCase();
                } else {
                    return user.full_name;
                }
            }), 'id').map(String);

            var dcontacts = Helpers.getEmails(ContactList.denningUsers, ['client', 'staff']);
            friends = _.filter(sortedContacts, function(el) {
                return dcontacts.indexOf(ContactList.contacts[el].email) != -1;
            });
            Helpers.log('Friends', friends);

            if (friends.length === 0) {
                popup.children(':not(.popup-header)').addClass('is-hidden');
                popup.find('.popup-nofriends').removeClass('is-hidden');
                return true;
            }

            // exclude users who are already present in the dialog
            friends = _.difference(friends, ids);

            for (var i = 0, len = friends.length; i < len; i++) {
                user_id = friends[i];

                html = Helpers.fillTemplate('tpl_contactItem', {
                    user: contacts[user_id], 
                    contact: false,
                    position: Helpers.getAttr(ContactList.denningUsers, contacts[user_id], 'position'),
                    last_seen: Helpers.getTime(contacts[user_id].last_request_at, true, true)
                });
                popup.find('.mCSB_container').append(html);
            }

            if (type || isPrivate) {
                existing_ids = ids.length > 0 ? ids : null;
                popup.addClass('is-addition').data('existing_ids', existing_ids);
            } else {
                popup.data('existing_ids', null);
            }
        },

        openGroupProfile: function(objDom, dialog_id, isPrivate) {
            var ids = objDom.data('ids') ? objDom.data('ids').toString().split(',') : [],
                popup = $('#popupChatProfile'),
                contacts = ContactList.contacts,
                roster = ContactList.roster,
                dialogs = Entities.Collections.dialogs,
                dialog = dialogs.get(dialog_id),
                dialog_tag = dialog.get('data').tag || '',
                user_role = Helpers.getRole(dialog.get('data'), User.contact),
                sortedContacts,
                existing_ids,
                user_id,
                friends,
                html;

            // select current tag selected
            $('.j-group-profile .chat-category select options').removeProp('selected');
            if (dialog_tag)
                $('.j-group-profile .chat-category select .'+dialog.get('data').tag.toLowerCase()).prop('selected', true);
            // role manage for the tag
            $('.j-group-profile .chat-category select').prop('disabled', 'disabled');
            if(Helpers.can_change_group_tag(dialog_tag, user_role)) 
                $('.j-group-profile .chat-category select').prop('disabled', false);

            // set current notification
            $('#group_notify').prop('checked', false);
            if (dialog.get('data').notifications) 
                $('#group_notify').prop('checked', 'checked');
            // role for mute
            if(!Helpers.can_mute(dialog_tag, user_role))
                $('#group_notify').prop('disabled', 'disabled');
            // set position
            $('#chatPosition input').val(dialog.get('data').position);

            // add member
            popup.find('.btn').removeClass('is-hidden');
            if(!Helpers.can_add_member(dialog_tag, user_role)) {
                $('.j-group-profile .addToGroupChat').addClass('is-hidden');
                $('.j-group-profile .deleteChat').addClass('is-hidden');                
            }

            ids = ids.concat([User.contact.id]);
            openPopup(popup, 'add', dialog_id);
            popup.addClass('not-selected').removeClass('is-addition');
            popup.find('.note').addClass('is-hidden').siblings('ul').removeClass('is-hidden');
            popup.find('.popup-nofriends').addClass('is-hidden').siblings().removeClass('is-hidden');
            
            popup.find('.list_contacts').mCustomScrollbar("scrollTo", "top");
            popup.find('.mCSB_container').empty();

            friends = ids;

            for (var i = 0, len = friends.length; i < len; i++) {
                user_id = friends[i];
                var member_role = Helpers.getRole(dialog.get('data'), contacts[user_id]);                

                html = Helpers.fillTemplate('tpl_contactItem', {
                    user: contacts[user_id], 
                    contact: 5,
                    user_role: member_role,
                    viewer_role: user_role,
                    can_change_role: Helpers.can_add_member(dialog_tag, user_role),
                    position: Helpers.getAttr(ContactList.denningUsers, contacts[user_id], 'position'),
                    last_seen: Helpers.getTime(contacts[user_id].last_request_at, true, true)
                });
                popup.find('.mCSB_container').append(html);
            }
        },

        showContacts: function(userType, prefix) {
            var contacts = ContactList.contacts,
                sortedContacts,
                keyword = '';

            $('.j-recentList')[0].innerHTML = '';

            userType = userType.replace("contact", "staff client").split(" ");
            _.each(userType, function(user_type) {
                _.each(ContactList.denningUsers[prefix+user_type], function(firm){
                    var users = _.filter(contacts, function(user) {
                        return user.full_name.match(new RegExp(keyword, "i")) && _.where(firm.users, {email: user.email}).length;
                    });

                    if (users.length) {
                        html = Helpers.fillTemplate('tpl_firm', {firm: firm});
                        $('.j-recentList').append(html);

                        _.each(users, function(user) {
                            if (user.email != self.app.models.User.contact.email) {
                                html = Helpers.fillTemplate('tpl_contactItem', {
                                    user: user, 
                                    contact: true, 
                                    is_favourite: Helpers.is_favourite(ContactList.denningUsers, user),
                                    position: Helpers.getAttr(ContactList.denningUsers, user, 'position'),
                                    last_seen: Helpers.getTime(user.last_request_at, true, true)
                                });
                                $('.j-recentList').append(html);                                
                            }
                        });
                    }
                });
            });
        },

        // subscriptions

        importFBFriend: function(id) {
            var jid = QB.chat.helpers.getUserJid(id, DCCONFIG.qbAccount.appId),
                roster = ContactList.roster;

            QB.chat.roster.add(jid, function() {
                // update roster
                roster[id] = {
                    'subscription': 'none',
                    'ask': 'subscribe'
                };
                ContactList.saveRoster(roster);

                Dialog.createPrivate(jid);
            });

        },

        sendSubscribe: function(jid, isChat, dialog_id) {
            var MessageView = this.app.views.Message,
                $objDom = $('.list-item[data-jid="' + jid + '"]'),
                roster = ContactList.roster,
                id = QB.chat.helpers.getIdFromNode(jid),
                $dialogItem = $('.dialog-item[data-id="' + id + '"]'),
                dialogItem = $dialogItem[0],
                requestItem = $('#requestsList .list-item[data-jid="' + jid + '"]'),
                notConfirmed = localStorage['DC.notConfirmed'] ? JSON.parse(localStorage['DC.notConfirmed']) : {},
                time = Math.floor(Date.now() / 1000),
                copyDialogItem,
                message,
                self = this;

            if (notConfirmed[id] && requestItem.length) {
                changeRequestStatus('Request accepted');
                self.sendConfirm(jid, 'new_dialog');
            } else {
                if (!isChat) {
                    changeRequestStatus('Request Sent');
                }

                if (dialog_id) {
                    if (!$dialogItem.length) {
                        Dialog.createPrivate(jid, 'new_dialog', dialog_id);
                    }
                } else {
                    QB.chat.roster.add(jid, function() {
                        if ($dialogItem.length) {
                            // send notification about subscribe
                            sendContactRequest({
                                jid: jid,
                                date_sent: time,
                                dialog_id: dialogItem.getAttribute('data-dialog'),
                                save_to_history: 1,
                                notification_type: '4',
                            });

                            message = Message.create({
                                'date_sent': time,
                                'chat_dialog_id': dialogItem.getAttribute('data-dialog'),
                                'sender_id': User.contact.id,
                                'notification_type': '4',
                                'online': true
                            });

                            MessageView.addItem(message, true, true);
                        } else {
                            Dialog.createPrivate(jid, true);
                        }
                    });
                }
            }

            // update roster
            roster[id] = {
                'subscription': 'none',
                'ask': 'subscribe'
            };
            ContactList.saveRoster(roster);

            dialogItem = $('.l-list-wrap section:not(#searchList) .dialog-item[data-id="' + id + '"]');
            copyDialogItem = dialogItem.clone();
            dialogItem.remove();
            $('#recentList ul').prepend(copyDialogItem);
            if ($('#searchList').is(':hidden')) {
                $('#recentList').removeClass('is-hidden');
                Helpers.Dialogs.isSectionEmpty($('.j-recentList'));
            }

            function changeRequestStatus(text) {
                var $buttonRequest = $objDom.find('.j-sendRequest');

                $buttonRequest.after('<span class="send-request l-flexbox">' + text + '</span>');
                $buttonRequest.remove();
            }
        },

        sendConfirm: function(jid, isClick) {
            var DialogView = this.app.views.Dialog,
                $objDom = $('.j-incomingContactRequest[data-jid="' + jid + '"]'),
                id = QB.chat.helpers.getIdFromNode(jid),
                $chat = $('.l-chat[data-id="' + id + '"]'),
                list = $objDom.parents('ul.j-requestsList'),
                roster = ContactList.roster,
                notConfirmed = localStorage['DC.notConfirmed'] ? JSON.parse(localStorage['DC.notConfirmed']) : {},
                hiddenDialogs = JSON.parse(sessionStorage['DC.hiddenDialogs']),
                time = Math.floor(Date.now() / 1000),
                dialogs = Entities.Collections.dialogs,
                copyDialogItem,
                dialogItem,
                message,
                dialogId,
                dialog,
                li;

            $objDom.remove();

            Helpers.Dialogs.isSectionEmpty(list);

            if ($chat.length) {
                $chat.removeClass('is-request');
            }

            // update notConfirmed people list
            delete notConfirmed[id];
            ContactList.saveNotConfirmed(notConfirmed);

            dialogId = Dialog.create({
                '_id': hiddenDialogs[id],
                'type': 3,
                'occupants_ids': [id],
                'unread_count': ''
            });

            dialog = dialogs.get(dialogId);
            if (dialog)
                Helpers.log('Dialog', dialog.toJSON());

            if (isClick) {
                QB.chat.roster.confirm(jid, function() {
                    // send notification about confirm
                    sendContactRequest({
                        jid: jid,
                        date_sent: time,
                        dialog_id: hiddenDialogs[id],
                        save_to_history: 1,
                        notification_type: '5'
                    });

                    message = Message.create({
                        'chat_dialog_id': hiddenDialogs[id],
                        'notification_type': '5',
                        'date_sent': time,
                        'sender_id': User.contact.id,
                        'online': true
                    });
                });
            }

            // update roster
            roster[id] = {
                'subscription': 'both',
                'ask': null
            };
            ContactList.saveRoster(roster);

            // delete duplicate contact item
            li = $('.dialog-item[data-id="' + id + '"]');
            list = li.parents('ul');
            li.remove();
            Helpers.Dialogs.isSectionEmpty(list);

            DialogView.addDialogItem(dialog);

            dialogItem = $('.l-list-wrap section:not(#searchList) .dialog-item[data-id="' + id + '"]');
            copyDialogItem = dialogItem.clone();
            dialogItem.remove();
            $('.j-recentList').prepend(copyDialogItem);
            if ($('#searchList').is(':hidden')) {
                $('#recentList').removeClass('is-hidden');
                Helpers.Dialogs.isSectionEmpty($('.j-recentList'));
            }

            dialogItem = $('.presence-listener[data-id="' + id + '"]');
            dialogItem.find('.status').removeClass('status_request');

            DialogView.decUnreadCounter(dialogId);
        },

        sendReject: function(jid, isClick) {
            var id = QB.chat.helpers.getIdFromNode(jid),
                $objDom = $('.j-incomingContactRequest[data-jid="' + jid + '"]'),
                roster = ContactList.roster,
                notConfirmed = localStorage['DC.notConfirmed'] ? JSON.parse(localStorage['DC.notConfirmed']) : {},
                hiddenDialogs = JSON.parse(sessionStorage['DC.hiddenDialogs']),
                time = Math.floor(Date.now() / 1000);

            $objDom.remove();

            Helpers.Dialogs.isSectionEmpty($('.j-requestsList'));

            // update roster
            roster[id] = {
                'subscription': 'none',
                'ask': null
            };

            ContactList.saveRoster(roster);

            // update notConfirmed people list
            delete notConfirmed[id];
            ContactList.saveNotConfirmed(notConfirmed);

            if (isClick) {
                QB.chat.roster.reject(jid, function() {
                    // send notification about reject
                    sendContactRequest({
                        jid: jid,
                        date_sent: time,
                        dialog_id: hiddenDialogs[id],
                        save_to_history: 1,
                        notification_type: '6'
                    });
                });
            }

            DialogView.decUnreadCounter(hiddenDialogs[id]);
        },

        sendDelete: function(id, isClick) {
            var DialogView = self.app.views.Dialog,
                VoiceMessage = self.app.models.VoiceMessage,
                dialogs = Entities.Collections.dialogs,
                jid = QB.chat.helpers.getUserJid(id, DCCONFIG.qbAccount.appId),
                li = $('.dialog-item[data-id="' + id + '"]'),
                list = li.parents('ul.j-list'),
                hiddenDialogs = JSON.parse(sessionStorage['DC.hiddenDialogs']),
                dialogId = li.data('dialog') || hiddenDialogs[id] || null,
                roster = ContactList.roster,
                dialog = dialogId ? dialogs.get(dialogId) : null,
                time = Math.floor(Date.now() / 1000);

            // update roster
            delete roster[id];
            ContactList.saveRoster(roster);

            // reset recorder state
            VoiceMessage.resetRecord(dialogId);

            // send notification about reject
            if (isClick) {
                QB.chat.roster.remove(jid, function() {
                    sendContactRequest({
                        jid: jid,
                        date_sent: time,
                        dialog_id: dialogId,
                        save_to_history: 1,
                        notification_type: '7'
                    });
                });

                if (dialogId) {
                    Dialog.deleteChat(dialog);
                }
            }

            if (dialogId) {
                DialogView.removeDialogItem(dialogId);
                DialogView.decUnreadCounter(dialogId);
            }
        },

        // callbacks
        onSubscribe: function(id) {
            var html,
                contacts = ContactList.contacts,
                jid = QB.chat.helpers.getUserJid(id, DCCONFIG.qbAccount.appId),
                $requestList = $('.j-requestsList'),
                $recentList = $('.j-recentList'),
                notConfirmed = localStorage['DC.notConfirmed'] ? JSON.parse(localStorage['DC.notConfirmed']) : {},
                duplicate;

            // update notConfirmed people list
            notConfirmed[id] = true;
            ContactList.saveNotConfirmed(notConfirmed);

            ContactList.add([id], null, function() {
                $recentList.find('.list-item[data-id="' + id + '"]').remove();
                self.autoConfirm(id);
                Helpers.Dialogs.isSectionEmpty($recentList);
            }, 'subscribe');
        },

        onConfirm: function(id) {
            var roster = ContactList.roster,
                dialogItem = $('.presence-listener[data-id="' + id + '"]'),
                $chat = $('.l-chat[data-id="' + id + '"]');

            // update roster
            roster[id] = {
                'subscription': 'to',
                'ask': null
            };

            ContactList.saveRoster(roster);

            dialogItem.find('.status').removeClass('status_request');
            dialogItem.removeClass('is-request');

            $chat.removeClass('is-request');
        },

        onReject: function(id) {
            var VoiceMessage = self.app.models.VoiceMessage,
                dialogItem = $('.presence-listener[data-id="' + id + '"]'),
                jid = QB.chat.helpers.getUserJid(id, DCCONFIG.qbAccount.appId),
                request = $('#requestsList .list-item[data-jid="' + jid + '"]'),
                list = request && request.parents('ul'),
                roster = ContactList.roster,
                notConfirmed = localStorage['DC.notConfirmed'] ? JSON.parse(localStorage['DC.notConfirmed']) : {};

            // reset recorder state
            VoiceMessage.resetRecord(dialogItem.data('dialog'));

            // update roster
            roster[id] = {
                'subscription': 'none',
                'ask': null
            };
            ContactList.saveRoster(roster);

            // update notConfirmed people list
            delete notConfirmed[id];
            ContactList.saveNotConfirmed(notConfirmed);

            dialogItem.find('.status').removeClass('status_online');
            if (dialogItem.is('.l-chat')) {
                dialogItem.addClass('is-request');
            }
            if (request.length > 0) {
                QB.chat.roster.remove(jid, function() {
                    request.remove();
                    Helpers.Dialogs.isSectionEmpty(list);
                });
            }
            dialogItem.addClass('is-request');
        },

        onPresence: function(id, type) {
            var dialogItem = $('.presence-listener[data-id="' + id + '"]'),
                roster = ContactList.roster;

            // update roster
            if (typeof roster[id] === 'undefined') {
                return true;
            }

            roster[id].status = !type;
            ContactList.saveRoster(roster);

            if (type) {
                dialogItem.find('.status').removeClass('status_online');

                if (dialogItem.is('.popup_details')) {
                    dialogItem.find('.status_text').text('Offline');
                }
            } else {
                dialogItem.find('.status').addClass('status_online');

                if (dialogItem.is('.popup_details')) {
                    dialogItem.find('.status_text').text('Online');
                }
            }
        },

        autoConfirm: function(id) {
            var jid = QB.chat.helpers.getUserJid(id, DCCONFIG.qbAccount.appId),
                notConfirmed = localStorage['DC.notConfirmed'] ? JSON.parse(localStorage['DC.notConfirmed']) : {},
                hiddenDialogs = notConfirmed[id] ? JSON.parse(sessionStorage['DC.hiddenDialogs']) : null,
                dialogId = hiddenDialogs[id] || null,
                activeId = Entities.active,
                dialogs = Entities.Collections.dialogs,
                dialog = dialogId ? dialogs.get(dialogId) : null;

            self.sendConfirm(jid, 'new_dialog');

            if (activeId === dialogId) {
                Entities.active = '';
                dialog.set({'opened': false});
                $('.j-dialogItem[data-dialog="' + dialogId + '"] > .contact').click();
            }
        }

    };

    /* Private
    ---------------------------------------------------------------------- */
    function sendContactRequest(params) {
        QB.chat.send(params.jid, {
            'type': 'chat',
            'body': 'Contact request:' + params.notification_type,
            'extension': {
                'date_sent': params.date_sent,
                'dialog_id': params.dialog_id,
                'save_to_history': params.save_to_history,
                'notification_type': params.notification_type
            }
        });
    }

    function openPopup(objDom, type, dialog_id) {
        objDom.add('.popups').addClass('is-overlay');
        if (type) {
            objDom.addClass(type).data('dialog', dialog_id);
        } else {
            objDom.removeClass('add').data('dialog', '');
        }
    }

    function scrollbarContacts() {
        $('.scrollbarContacts').mCustomScrollbar({
            theme: 'minimal-dark',
            scrollInertia: 150,
            mouseWheel: {
                scrollAmount: 60,
                deltaFactor: 'auto'
            },
            live: true
        });
    }

    function scrollbar(list, self) {
        list.mCustomScrollbar({
            theme: 'minimal-dark',
            scrollInertia: 150,
            mouseWheel: {
                scrollAmount: 60,
                deltaFactor: 'auto'
            },
            callbacks: {
                onTotalScroll: function() {
                    ajaxDownloading(list, self);
                }
            },
            live: true
        });
    }

    // ajax downloading of data through scroll
    function ajaxDownloading(list, self) {
        var page = parseInt(sessionStorage['DC.search.page']),
            allPages = parseInt(sessionStorage['DC.search.allPages']);

        if (page <= allPages) {
            self.createDataSpinner(list);
            ContactList.globalSearch(function(results) {
                createListResults(list, results, self);
            });
        }
    }

    function createListResults(list, results, self) {
        var roster = ContactList.roster,
            notConfirmed = localStorage['DC.notConfirmed'] ? JSON.parse(localStorage['DC.notConfirmed']) : {},
            item;

        if (results.length > 0) {
            results.forEach(function(contact) {
                var rosterItem = roster[contact.id];

                item = '<li class="list-item j-listItem" data-jid="' + contact.user_jid + '">';
                item += '<a class="contact l-flexbox" href="#">';
                item += '<div class="l-flexbox_inline">';
                item += '<div class="contact-avatar avatar profileUserAvatar" style="background-image:url(' + contact.avatar_url + ')" data-id="' + contact.id + '"></div>';
                item += '<span class="name profileUserName" data-id="' + contact.id + '">' + contact.full_name + '</span>';
                item += '</div>';
                if (!rosterItem || (rosterItem && rosterItem.subscription === 'none' && !rosterItem.ask && !notConfirmed[contact.id])) {
                    item += '<button class="send-request j-sendRequest"><img class="icon-normal" src="images/icon-request.svg" alt="request">';
                    item += '<img class="icon-active" src="images/icon-request_active.svg" alt="request"></button>';
                }
                if (rosterItem && rosterItem.subscription === 'none' && rosterItem.ask) {
                    item += '<span class="send-request l-flexbox">Request Sent</span>';
                }
                item += '</a></li>';

                list.find('.mCSB_container').append(item);
                list.removeClass('is-hidden').siblings('.popup-elem').addClass('is-hidden');
            });
        } else {
            list.parents('.popup_search').find('.note').removeClass('is-hidden').siblings('.popup-elem').addClass('is-hidden');
        }

        self.removeDataSpinner();
    }

    return ContactListView;

});
