define([
    'jquery',
    'uiComponent',
    'Magento_Customer/js/customer-data',
    'underscore',
    'jquery/jquery-storageapi'
], function ($, Component, customerData, _) {
    'use strict';

    return Component.extend({
        defaults: {
            cookieMessages: [],
            messages: [],
            isHidden: false,
            selector: '.page.messages .messages',
            listens: {
                isHidden: 'onHiddenChange'
            }
        },

        /**
         * Extends Component object by storage observable messages.
         */
        initialize: function () {
            this._super();

            this.cookieMessages = $.cookieStorage.get('mage-messages');
            this.messages = customerData.get('messages').extend({
                disposableCustomerData: 'messages'
            });

            // Force to clean obsolete messages
            if (!_.isEmpty(this.messages().messages)) {
                customerData.set('messages', {});
            }

            $.cookieStorage.set('mage-messages', '');

        },

        initObservable: function () {
            this._super()
                .observe('isHidden');

            return this;
        },

        isVisible: function () {
            return this.isHidden(!_.isEmpty(this.messages().messages) || !_.isEmpty(this.cookieMessages));
        },

        removeAll: function () {
            $(self.selector).hide();
        },

        onHiddenChange: function (isHidden) {
            var self = this;

            // Hide message block if needed
            if (isHidden) {
                setTimeout(function () {
                    $(self.selector).hide();
                }, 30000);
            }
        }
    });
});