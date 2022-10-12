/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
    'jquery',
    'underscore',
    'ko',
    'mageUtils',
    'uiComponent',
    'uiLayout',
    'Magento_Customer/js/model/address-list',
    'Magento_Checkout/js/model/address-converter',
    'Magento_Customer/js/model/customer',
    'Magento_Customer/js/customer-data',
    'Magento_Checkout/js/model/quote',
    'Magento_Checkout/js/action/create-shipping-address',
    'Magento_Checkout/js/action/select-shipping-address',
    'Magento_Checkout/js/model/shipping-rates-validator',
    'Magento_Checkout/js/model/shipping-address/form-popup-state',
    'Magento_Checkout/js/model/shipping-service',
    'Magento_Checkout/js/action/select-shipping-method',
    'Magento_Checkout/js/model/shipping-rate-registry',
    'Magento_Checkout/js/action/set-shipping-information',
    'Magento_Checkout/js/model/step-navigator',
    'Magento_Ui/js/modal/modal',
    'Magento_Checkout/js/model/checkout-data-resolver',
    'Magento_Checkout/js/checkout-data',
    'uiRegistry',
    'mage/translate',
    'Magento_Checkout/js/model/shipping-rate-service',
    'mage/multiselect',
    'Magento_Checkout/js/select2',
    'mage/url',
    'jquery/jquery.cookie'
], function ($, _, ko, utils, Component, layout, addressList, addressConverter,
             customer,
             customerData,
             quote,
             createShippingAddress,
             selectShippingAddress,
             shippingRatesValidator,
             formPopUpState,
             shippingService,
             selectShippingMethodAction,
             rateRegistry,
             setShippingInformationAction,
             stepNavigator,
             modal,
             checkoutDataResolver,
             checkoutData,
             registry,
             $t,
             multiselect2,
             select2,
             urlBuilder
             ) {
    'use strict';

    var newShippingAddressOption = {
            getAddressInline: function () {
                return $t('New Address');
            },
            customerAddressId: null
        },

        shippingAddressOptions = addressList().filter(function (address) {
            return address.getType() == 'customer-address';
        });

  
    $('#search-shiping-address').select2();
    $('#add').html(quote.shippingAddress);
    var defaultRendererTemplate = {
        parent: '${ $.$data.parentName }',
        name: '${ $.$data.name }',
        component: 'Magento_Checkout/js/view/shipping-address/address-renderer/default'
    };

    return Component.extend({
        defaults: {
            template: 'DCKAP_CheckoutCustomisation/shipping-address/list',
            visible: addressList().length > 0,
            rendererTemplates: []
        },
        isFormPopUpVisible: formPopUpState.isVisible,
        currentShippingAddress: quote.shippingAddress,
        shippingAddressOptions: shippingAddressOptions,
        customerHasShippinhAddresses: shippingAddressOptions.length > 1,

        /** @inheritdoc */
        initialize: function () {
            this._super()
                .initChildren();

            $('#search-shiping-address').select2();
            var refreshIntervalId = setInterval(contentOnload, 1000);
            function contentOnload()
            {
             if($(".checkout-index-index .field.addresses").length)
              {
                    $(".checkout-index-index .field.addresses .shipping-address-items .shipping-address-item").hide();
                    $("#custom-address-items").hide();
                    $(".checkout-index-index .field.addresses .shipping-address-items .shipping-address-item").css("pointer-events","none");
                    clearInterval(refreshIntervalId);
                }
            }

             
            addressList.subscribe(function (changes) {
                    var self = this;

                    changes.forEach(function (change) {
                        if (change.status === 'added') {
                            self.createRendererComponent(change.value, change.index);
                        }
                    });
                },
                this,
                'arrayChange'
            );

            return this;
        },

        /**
         * @return {exports.initObservable}
         */
        initObservable: function () {
            this._super()
                .observe({
                    selectedShippingAddress: null,
                    isShippingAddressDetailsVisible: quote.shippingAddress() != null,
                    isShippingAddressFormVisible: !customer.isLoggedIn() || shippingAddressOptions.length === 1,
                    saveInAddressBook: 1
                });

            quote.shippingAddress.subscribe(function (newShippingAddress) {
                if (newShippingAddress != null && newShippingAddress.saveInAddressBook !== undefined) {
                    this.saveInAddressBook(newShippingAddress.saveInAddressBook);
                } else {
                    this.saveInAddressBook(1);
                }
                this.isShippingAddressDetailsVisible(true);
            }, this);
            $('#search-shiping-address').select2();
             $("#add").html(quote.shippingAddress());
            
            return this;
        },

        /**
         * @param {Object} address
         * @return {*}
         */
        shippingaddressOptionsText: function (address) {
            return address.getAddressInline();
        },
        getCountryName: function (countryId) {
            var countryData = customerData.get('directory-data');
            return countryData()[countryId] != undefined ? countryData()[countryId].name : '';
        },

        /**
         * @param {Object} address
         */
        onShippingAddressChange: function (address) {
            
            this.isShippingAddressFormVisible(address == newShippingAddressOption); //eslint-disable-line eqeqeq
            if(address == newShippingAddressOption)
            {
                this.showFormPopUp();
            }
            else
            {
                this.updateAddress();
                $("#custom-address-items").hide();
                $(".checkout-index-index .field.addresses .shipping-address-items .shipping-address-item").hide();
                checkoutData.setSelectedShippingAddress(address.getKey());
            }
            $('#search-shiping-address').select2();
            $('.select2-results__option--highlighted').attr('aria-selected','false');
            var selectAddress=address.getAddressInline();
           
            $("#add").val( selectAddress.replace(/,/g, '\n'));
        },
        createCookie:function (cookieName, cookieValue, daysToExpire){

            var date = new Date();
            date.setTime(date.getTime() + (daysToExpire * 24 * 60 * 60 * 1000));
            document.cookie = cookieName + "=" + cookieValue + "; expires=" + date.toGMTString();
        },
     
        /**
         * Show address form popup
         */
        showFormPopUp: function () {
            this.isFormPopUpVisible(true);
        },
        getpickupdateconfig:function(){
            var pickupdate = $.parseJSON(window.checkoutConfig.pickupdate);

            return pickupdate;
        },
        getpickupdaterequire:function(){
            var pickupdatereq = $.parseJSON(window.checkoutConfig.pickupdatereq);

            return pickupdatereq;
        },
        getpickupdeliveryoption:function(){
            var pickupdeliveryoption = $.parseJSON(window.checkoutConfig.pickup_option);
            return pickupdeliveryoption;
        },
      getIsShitoBasedPriceEnable:function(){
            var isShitoBasedPriceEnable = $.parseJSON(window.checkoutConfig.is_shipto_based_price_enable);
            return isShitoBasedPriceEnable;
        },
        getIsMiscAmtEnable:function(){
            var isMiscAmountEnable = $.parseJSON(window.checkoutConfig.is_misc_amount);
            return isMiscAmountEnable;
        },

        /**
         * Update address action
         */
        updateAddress: function () {

            var addressData, newShippingAddress;
            if (this.selectedShippingAddress() && this.selectedShippingAddress() != newShippingAddressOption) { //eslint-disable-line eqeqeq
                selectShippingAddress(this.selectedShippingAddress());
                checkoutData.setSelectedShippingAddress(this.selectedShippingAddress().getKey());
            } else {
                this.source.set('params.invalid', false);
                this.source.trigger(this.dataScopePrefix + '.data.validate');

                if (this.source.get(this.dataScopePrefix + '.custom_attributes')) {
                    this.source.trigger(this.dataScopePrefix + '.custom_attributes.data.validate');
                }

                if (!this.source.get('params.invalid')) {
                    addressData = this.source.get(this.dataScopePrefix);

                    if (customer.isLoggedIn() && !this.customerHasAddresses) { //eslint-disable-line max-depth
                        this.saveInAddressBook(1);
                    }
                    addressData['save_in_address_book'] = this.saveInAddressBook() ? 1 : 0;
                    newShippingAddress = createShippingAddress(addressData);

                    // New address must be selected as a billing address
                    selectedShippingAddress(newShippinhAddress);
                    checkoutData.setSelectedShippingAddress(newShippingAddress.getKey());
                    checkoutData.setNewCustomerShippingAddress(addressData);
                    $("#add").html(addressData);
                 
                }
            }
            if(this.getIsShitoBasedPriceEnable()){
               /* this.updateErpPrice();*/
            }else{
                var date = new Date();
                date.setTime(date.getTime() + (20 * 24 * 60 * 60 * 1000));
                document.cookie = "ship-to" + "=" + "" + "; expires=" + date.toGMTString();
            }
        },

        /**
         * Trigger action to update shipping and billing addresses
         */
        updateShippingAddresses: function () {
            //$('input[value="ddistorepickup_ddistorepickup"]').parents('tr').css("display","none");
            setShippingAddressAction(globalMessageList);
        },

        /** @inheritdoc */
        initConfig: function () {
            this._super();
            // the list of child components that are responsible for address rendering
            this.rendererComponents = [];

            return this;
        },

        /** @inheritdoc */
        initChildren: function () {
            _.each(addressList(), this.createRendererComponent, this);

            return this;
        },

        /**
         * Create new component that will render given address in the address list
         *
         * @param {Object} address
         * @param {*} index
         */
        createRendererComponent: function (address, index) {
            var rendererTemplate, templateData, rendererComponent;
            var getCity=address.city;
            var getRegion=address.region;
            var getStreet=address.street.join(' ');
            var countryId = address.countryId;
            var country = this.getCountryName(countryId);
            var getAddress=address.firstname+' '+address.lastname+','+getStreet.replace(/,\s*$/, "")+','+getCity.replace(/,\s*$/, "")+','+getRegion.replace(/,\s*$/, "")+' '+address.postcode+','+country;
                
            if (index in this.rendererComponents) {

                this.rendererComponents[index].address(address);
              
                 $("#add").val( getAddress.replace(/,/g, '\n'));
            } else {
                // rendererTemplates are provided via layout
                rendererTemplate = address.getType() != undefined && this.rendererTemplates[address.getType()] != undefined ? //eslint-disable-line
                    utils.extend({}, defaultRendererTemplate, this.rendererTemplates[address.getType()]) :
                    defaultRendererTemplate;
                templateData = {
                    parentName: this.name,
                    name: index
                };
                rendererComponent = utils.template(rendererTemplate, templateData);
                utils.extend(rendererComponent, {
                    address: ko.observable(address)
                });
                layout([rendererComponent]);
                this.rendererComponents[index] = rendererComponent;
                
                 $('#search-shiping-address').select2();
                 /*if(address){
                    var refreshIntervalIda = setInterval(contentOnloada, 1000);
                    function contentOnloada()
                    {
                     if($("#add").length)
                      {
                        var getAddress=address.firstname+' '+address.lastname+','+address.street.join(' ')+','+address.city+','+address.region+' '+address.postcode+','+"United States";
                            $("#add").val( getAddress.replace(/,/g, '\n'));
                            clearInterval(refreshIntervalIda);
                        }
                    }
                }*/
                $("#add").val( getAddress.replace(/,/g, '\n'));
            }
        }
    });
});
