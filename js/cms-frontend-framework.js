/** -------------------------------------------------------------- //

Global State

*/

var _CMS_GLOBAL_STATE_ = {
    codeembed: {
        iframe: {
            listener: false,
            height: {}
        }
    },
    contactforms: {
        routes: [
            "/modules/email/send",
            "/modules/extended/process_form"
        ]
    }
};

/** -------------------------------------------------------------- //

AJAX Setup

*/

$.ajaxSetup({ 
    cache: true
});

/** -------------------------------------------------------------- //

AJAX Prefilter

*/

$.ajaxPrefilter(function(options, originalOptions, jqXHR) {

    if((
        typeof(originalOptions.type) != "undefined" && 
        originalOptions.type.toLowerCase() == "post"
    )) {

        var has_contact_fields = false;

        if(typeof(originalOptions.data) !== "undefined") {

            try {

                if(originalOptions.data instanceof FormData) {

                    if(
                        originalOptions.data.has("from") &&
                        originalOptions.data.has("serialized")
                    ) {
                        has_contact_fields = true;
                    }

                } else {

                    if(
                        typeof(originalOptions.data.from) != "undefined" &&
                        typeof(originalOptions.data.serialized) != "undefined"
                    ) {
                        has_contact_fields = true;
                    } else {

                        if(typeof(originalOptions.data.config) == "object") {

                            if(
                                typeof(originalOptions.data.config.from) != "undefined" &&
                                typeof(originalOptions.data.config.serialized) != "undefined"
                            ) {
                                has_contact_fields = true;
                            }

                        }

                    }

                }

            } catch(e) {}

        }

        if(
            has_contact_fields || 
            $.inArray(options.url, _CMS_GLOBAL_STATE_["contactforms"]["routes"]) !== -1
        ) {

            var deferred = $.Deferred();

            jqXHR.then(function(data, textStatus, jqXHR) {

                var response = data;

                if(typeof(data) != "object") {

                    try {

                        response = JSON.parse(response);

                    } catch(e) {

                        deferred.resolve(data, textStatus, jqXHR);

                    }

                }

                if(response.status == "captcha") {

                    try {

                        CMS.email.captcha.render(response.data.h_captcha_site_key, {
                            success: function(h_captcha_response) {

                                CMS.email.captcha.reset();

                                if(originalOptions.data instanceof FormData) {

                                    originalOptions.data.append("h-captcha-response", h_captcha_response);

                                } else {

                                    originalOptions.data["h-captcha-response"] = h_captcha_response;

                                }

                                $.ajax(originalOptions);

                            },
                            error: function(error_code) {

                                CMS.email.captcha.reset();

                                deferred.resolve(data, textStatus, jqXHR);
                                
                            }
                        });

                    } catch(e) {

                        deferred.resolve(data, textStatus, jqXHR);

                    }

                } else if(response.status == "turnstile") {

                    try {

                        CMS.email.turnstile.render(response.data.cf_turnstile_site_key, {
                            success: function(cf_turnstile_response) {

                                CMS.email.turnstile.reset();

                                if(originalOptions.data instanceof FormData) {

                                    originalOptions.data.append("cf-turnstile-response", cf_turnstile_response);

                                } else {

                                    originalOptions.data["cf-turnstile-response"] = cf_turnstile_response;

                                }

                                $.ajax(originalOptions);

                            },
                            error: function(error_code) {

                                CMS.email.turnstile.reset();

                                deferred.resolve(data, textStatus, jqXHR);
                                
                            }
                        });

                    } catch(e) {

                        deferred.resolve(data, textStatus, jqXHR);

                    }

                } else {

                    deferred.resolve(data, textStatus, jqXHR);

                }

            });

            jqXHR = deferred.promise(jqXHR);
            
            jqXHR.success = jqXHR.done;
            jqXHR.error = jqXHR.fail;

            return deferred;

        }

    }

});

/** -------------------------------------------------------------- //

CMS Frontend Framework

*/

var CMSFrontendFramework = function(CMSFrontendFrameworkCallback, page) {

    if(typeof(page) == "undefined") { var page = location.pathname; }

    var CMS = {
        block: {
            get: function(block, callback) {

                    if(typeof(callback) == "undefined") { callback = function() {} }

                    if(block) {

                    $.post("/modules/settings/get/getBlock", { block: block },
                        function(data) {

                            if(data.status == "success") {

                                callback(data.block);

                            } else {
                                callback(false);
                            }

                        }, "json");

                    } else {
                        callback(false);
                    }

            },
            settings: {
                get: function(block, callback) {

                    if(typeof(callback) == "undefined") { callback = function() {} }

                    if(block) {

                    $.post("/modules/settings/get/getBlockSetting", { block: block, setting: false },
                        function(data) {

                            if(data.status == "success") {

                                callback(data.settings);

                            } else {
                                callback(false);
                            }

                        }, "json");

                    } else {
                        callback(false);
                    }

                }
            }
        },
        email: {
            process: function(block, form, from, callback) {

                if(typeof(callback) == "undefined") { var callback = function() { } }

                $(form).find("textarea[value=''], input[type='text'][value='']").val("");

                var serialized = form.serializeArray();

                if(!CMS.version.minimum("1.1.11")) {

                    serialized = serialized.concat(
                        jQuery('input[type=checkbox]:not(:checked)', form).map(
                        function() {
                            return {"name": this.name, "value": "off"}
                        }).get()
                    );

                }

                var serializedFinal = Array();

                $.each(serialized, function(i, item) {

                    if(typeof(item.name) != "undefined" && item.name != "") {
                        serializedFinal.push(item);
                    }

                });

                var blockArray = [].concat(block);

                $.each(blockArray, function(i, block) {

                    var config = {
                        href    : window.location.href,
                        block   : block,
                        from    : { name: from.name, email: from.email },
                        form    : serializedFinal
                    };

                    /** -------------------------------------------------------------- //

                    Gather FormData

                    */

                    var FORM_DATA = new FormData();

                    $.each(config, function(k, v) {
                        FORM_DATA.append(k, JSON.stringify(v));
                    });

                    /** -------------------------------------------------------------- //
                    
                    Check For File Upload
                    
                    */

                    var $files = form.find('[type="file"][data-cms-file-upload]'),
                        file_count = 0;

                    if($files.length > 0) {

                        $files.each(function() {

                            var $file = $(this),
                                name = $file.attr("name");

                            if($file.val() != "") {

                                $.each($file[0].files, function(file_index, file) {

                                    FORM_DATA.append(name + "_" + file_index, file);
                                    file_count++;

                                });

                            }

                        });

                    }

                    /** -------------------------------------------------------------- //
                    
                    If there are file uploads...
                    --

                    Use the FORM_DATA method
                    
                    */

                    if(file_count > 0) {

                        $.ajax({
                            type: 'POST',
                            url: '/modules/email/send',
                            data: FORM_DATA,
                            success: function(response) {

                                response = $.parseJSON(response);

                                if(typeof(response["status"]) == "undefined") {
                                    response["status"] = "error";
                                }

                                if(typeof(response["message"]) == "undefined") {
                                    response["message"] = "Unknown error.";
                                }

                                if(typeof(response["data"]) == "undefined") {
                                    response["data"] = false;
                                }

                                callback(response);

                            },
                            error: function(response) {

                                response = $.parseJSON(response);

                                callback(response);

                            },
                            processData: false,
                            contentType: false
                        });

                    /** -------------------------------------------------------------- //
                    
                    Otherwise
                    --

                    Use the classic method
                    
                    */

                    } else {

                        $.post('/modules/email/send', { config: config }, function(data) {

                            callback(data);

                        }, 'json');

                    }

                });

            },
            captcha: {

                "element_id": "email-form-h-captcha-element",
                "instance": null,

                "render": function(h_captcha_site_key, callbacks) {

                    CMS.email.captcha.reset();

                    $.getScript("https://js.hcaptcha.com/1/api.js?render=explicit", function() {

                        var $dialog = $('dialog[open]');

                        if($dialog.length > 0) {

                            var $captcha_element = $('<div />');
                                $captcha_element.attr("id", CMS.email.captcha.element_id);

                            var $captcha_element_inner = $('<div />');
                                $captcha_element_inner.attr("id", CMS.email.captcha.element_id + "-inner");

                            $captcha_element.append($captcha_element_inner);

                            var $captcha_target = $('[data-captcha-target]', $dialog);

                            if($captcha_target.length === 0) {

                                $captcha_target = $("article", $dialog);

                            }

                            $captcha_target.append($captcha_element);

                        } else {

                            var $captcha_element = $('<div />');
                                $captcha_element.attr("id", CMS.email.captcha.element_id);
                                $captcha_element.css({
                                    "position": "fixed",
                                    "z-index": 999999999999,
                                    "background": "rgba(255,255,255,0.8)",
                                    "display": "flex",
                                    "align-items": "center",
                                    "justify-content": "center",
                                    "height": "100vh",
                                    "width": "100vw",
                                    "top": "0",
                                    "left": "0"
                                });

                            var $captcha_element_inner = $('<div />');
                                $captcha_element_inner.attr("id", CMS.email.captcha.element_id + "-inner");

                            $captcha_element.append($captcha_element_inner);

                            $("body").append($captcha_element);

                        }

                        CMS.email.captcha.instance = hcaptcha.render(CMS.email.captcha.element_id + "-inner", {
                            "sitekey": h_captcha_site_key,
                            "callback": function(h_captcha_response) { 

                                callbacks.success(h_captcha_response);

                            },
                            "error-callback": function(error_code) {

                                callbacks.error(error_code);

                            }
                        });

                    });

                },

                "reset": function() {

                    if(CMS.email.captcha.instance) {
                        hcaptcha.reset(CMS.email.captcha.instance);
                    }

                    // Remove custom element
                    $("#" + CMS.email.captcha.element_id).remove();

                    // Remove hidden fields
                    $('[name="h-captcha-response"], [name="g-recaptcha-response"]').remove();

                }

            },
            turnstile: {

                "element_id": "email-form-cf-turnstile-element",
                "instance": null,

                "render": function(cf_turnstile_site_key, callbacks) {

                    CMS.email.turnstile.reset();

                    $.getScript("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", function() {

                        var $dialog = $('dialog[open]');

                        if($dialog.length > 0) {

                            var $turnstile_element = $('<div />');
                                $turnstile_element.attr("id", CMS.email.turnstile.element_id);

                            var $turnstile_element_inner = $('<div />');
                                $turnstile_element_inner.attr("id", CMS.email.turnstile.element_id + "-inner");

                            $turnstile_element.append($turnstile_element_inner);

                            var $turnstile_target = $('[data-turnstile-target]', $dialog);

                            if($turnstile_target.length === 0) {

                                $turnstile_target = $("article", $dialog);

                            }

                            $turnstile_target.append($turnstile_element);

                        } else {

                            var $turnstile_element = $('<div />');
                                $turnstile_element.attr("id", CMS.email.turnstile.element_id);
                                $turnstile_element.css({
                                    "position": "fixed",
                                    "z-index": 999999999999,
                                    "background": "rgba(255,255,255,0.8)",
                                    "display": "flex",
                                    "align-items": "center",
                                    "justify-content": "center",
                                    "height": "100vh",
                                    "width": "100vw",
                                    "top": "0",
                                    "left": "0"
                                });

                            var $turnstile_element_inner = $('<div />');
                                $turnstile_element_inner.attr("id", CMS.email.turnstile.element_id + "-inner");

                            $turnstile_element.append($turnstile_element_inner);

                            $("body").append($turnstile_element);

                        }

                        var turnstile_config = {
                            "sitekey": cf_turnstile_site_key,
                            "callback": function(cf_turnstile_response) {
                                callbacks.success(cf_turnstile_response);
                            },
                            "error-callback": function(error_code) {

                                callbacks.error(error_code);

                            }
                        };

                        try {

                            turnstile_config["action"] = $('meta[name="cybernautic-editor-instance"]').first().attr("content").replace(/\-/g, "__").replace(/\./g, "_").substring(0, 32);

                        } catch(e) {}

                        turnstile.render("#" + CMS.email.turnstile.element_id, turnstile_config);

                    });

                },

                "reset": function() {

                    if(CMS.email.turnstile.instance) {
                        turnstile.reset(CMS.email.turnstile.instance);
                    }

                    // Remove custom element
                    $("#" + CMS.email.turnstile.element_id).remove();

                    // Remove hidden fields
                    $('[name="cf-turnstile-response"]').remove();

                }

            }
        },
        validate: {
            URL: function(url) {
                return /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url)
            },
            email: function(sEmail) {

                var reEmail = /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/;

                if(!sEmail.match(reEmail)) { return false; }

                return true;

            }
        },
        externalLinks: function(not) {

            if(typeof(not) == "undefined") { var not = Array(); }

            $("a[href]")
                .not("[data-role='listview'] a")
                .not("[data-external-links='false'] a")
                .not("a[data-external-links='false']")
                .not("a[target]")
                .each(function() {

                if(jQuery.inArray(this.href, not) === -1) {

                    if(typeof(this.href) != "undefined" && this.href.indexOf("javascript") == -1) {

                        if(this.href.indexOf(location.hostname) == -1) {
                            if(this.href.indexOf("mailto:") == -1 && this.href.indexOf("tel:") == -1 && this.href.indexOf("sms:") == -1) {
                                $(this).attr("target", "_blank").addClass("cms-external-link");
                                if($(this).attr("title") === undefined) { $(this).attr("title", "External Link | " + $(this).attr("href")); }
                            }
                        }

                    }

                    if(typeof($(this).attr("href")) != "undefined") {

                        if($(this).attr("href").substr(0, "/file/".length) == "/file/") {
                            var title = typeof($(this).data("filename")) == "undefined" ? "" : " | " + $(this).data("filename");
                            $(this).attr("target", "_blank").addClass("cms-external-link");
                            if($(this).attr("title") === undefined) { $(this).attr("title", "File" + title); }
                        }

                    }

                    // Reverse tabnabbing hardening: pair every target="_blank" we
                    // add with rel="noopener" so the opened page can't script
                    // window.opener (cyborg-t217)
                    if($(this).attr("target") === "_blank") {
                        var rel = $(this).attr("rel") || "";
                        if(rel.toLowerCase().indexOf("opener") === -1) { $(this).attr("rel", $.trim(rel + " noopener")); }
                    }

                }

            });

        },
        inlineLabel: function(input) {

            // If a password field is involved
            if(input.attr("type") == "password") {

                var real = input;
                var label = real.attr("data-label");  // Default search input text

                var span = $("<span />"),
                    fake = $("<input />");

                    fake.attr("name", "fake-" + real.attr("name")).val(label);

                    if(typeof(real.attr("style")) != "undefined") {
                        fake.attr("style", real.attr("style"));
                    }

                real.wrap(span);

                real.hide().parent().append(fake);

                fake.attr("class", real.attr("class"));

                fake.focus(function() {
                    fake.hide();
                    real.show().focus();
                });

                real.focusout(function() {
                    if(real.val() == "" || real.val() == label) {
                        real.hide();
                        fake.show();
                    }
                });

            } else {

                var label = input.attr("data-label");  // Default search input text

                if(input.val() == "") input.val(label);

                // When search input is focused, clear default value
                input.focus(function() {

                    if($(this).val() == label) {

                        label = $(this).val();
                        $(this).val("");

                    }

                });

                // When search input is unfocused and blank, return to default state
                input.focusout(function() { if($(this).val() == "") { $(this).val(label); } });

            }

        },
        equalHeights: function(collection) {

            var tallest = 0;

            collection.each(function(i,v) {

                var OH = $(this).outerHeight();
                if(OH > tallest) { tallest = OH; }

            });

            collection.height(tallest);

        },
        formElements: function(elements) {

            elements.each(function(i,v) {

                var E = $(this);

                if(E.is("select")) {

                    var SELECTED = E.find(':selected');

                    var SPAN = $("<span />");
                        SPAN.addClass("cms-custom-select");
                        SPAN.attr("data-name", E.attr("name"));

                    var INNER = $("<span />");
                        INNER.addClass("cms-custom-select-inner");
                        INNER.html(SELECTED.text());

                    var TAB = $("<span />");
                        TAB.addClass("cms-custom-select-tab");

                    SPAN.append(INNER).append(TAB);

                    E.after(SPAN).css({ position: 'absolute', opacity: 0, fontSize: E.next().css('font-size'), "z-index": 99 });

                    INNER.css({ width: parseInt(INNER.width()), height: parseInt(INNER.height()) });

                    E.show();

                    E.width(SPAN.outerWidth()).height(SPAN.outerHeight()).css("top", SPAN.position().top + "px").change(function() {
                        INNER.text(E.find(':selected').text()).parent().addClass('changed');
                    });

                    E.hover(function() {
                        SPAN.addClass("hover");
                    }, function() {
                        SPAN.removeClass("hover");
                    });

                    E.on('focus', function() { SPAN.addClass("focus"); });
                    E.on('blur', function() { SPAN.removeClass("focus"); });

                    if(typeof(E.attr("data-selected") != "undefined")) {

                        E.val(E.attr("data-selected"));
                        INNER.html(E.find(':selected').text());

                    }

                }

            });

        },
        responsivecolumns: function() {

            var $wrappers = $('.textbox-columns-wrapper');

            $wrappers.each(function() {

                var $wrapper = $(this),
                    $tds = $("td", $wrapper);

                $tds.each(function() {

                    var $td = $(this),
                        $td_clone = $td.clone();

                    $("p", $td_clone).each(function() {

                        var $p = $(this);

                        if($p.children().length === 0 && $.trim($p.text().replace(/\s\B/ig, '')) == "") {
                            $p.remove(); 
                        }

                    });

                    if($td_clone.children().length === 0 && $.trim($td_clone.text().replace(/\s\B/ig, '')) == "") {

                        $td.addClass("textbox-columns-empty-column");

                    }

                });

            });

        },
        version: {
            get: function() {

                var $ELEMENT = $("meta[name='cybernautic-editor-version']");

                return $ELEMENT.length > 0 ? $ELEMENT.attr("content") : "1.1.10";

            },
            minimum: function(required) {

                return CMS.version.compare(CMS.version.get(), required);

            },
            compare: function(current, required) {

                var a = current.split('.');
                var b = required.split('.');

                for (var i = 0; i < a.length; ++i) {
                    a[i] = Number(a[i]);
                }
                for (var i = 0; i < b.length; ++i) {
                    b[i] = Number(b[i]);
                }
                if (a.length == 2) {
                    a[2] = 0;
                }

                if (a[0] > b[0]) return true;
                if (a[0] < b[0]) return false;

                if (a[1] > b[1]) return true;
                if (a[1] < b[1]) return false;

                if (a[2] > b[2]) return true;
                if (a[2] < b[2]) return false;

                return true;

            }
        }
    }

    /*

    Jotform
    ---------------------------------------------------------------

    */    

    CMS.jotform = {

        cache: {},

        init: function($config) {

            if(typeof($config) == "undefined") {
                console.error("Missing Jotform $config!");
                return false;
            }

            var $wrapper = $config.closest('.jotform-iframe-wrapper'),
                $iframe = $wrapper.find('.jotform-iframe');

            if($wrapper.length === 0) {
                console.error("Missing Jotform iframe wrapper!");
                return false;
            }

            if($iframe.length === 0) {
                console.error("Missing Jotform iframe!");
                return false;
            }

            /** -------------------------------------------------------------- //

            Get JSON config
            
            */

            var config = {};

            try {
                config = JSON.parse($config.html());
            } catch(e) {
                console.error(e);
                return false;
            }

            /** -------------------------------------------------------------- //
            
            Validate form ID
            
            */

            if(typeof(config.form_id) == "undefined") {
                console.error("Missing Jotform form ID!");
                return false;
            }

            /** -------------------------------------------------------------- //
            
            Store common nodes
            
            */

            config.nodes = {
                "$wrapper": $wrapper,
                "$iframe": $iframe,
                "wrapper": $wrapper[0],
                "iframe": $iframe[0]
            };

            /** -------------------------------------------------------------- //
            
            Store instance
            
            */

            var INSTANCE = {
                config: config
            };

            /** -------------------------------------------------------------- //
            
            Run Callback Functions
            
            */

            INSTANCE.run_callbacks = function() {

                /** -------------------------------------------------------------- //
                
                Set [data-submitted="true"] on the wrapper for all forms
                
                */

                config.nodes.$wrapper.attr("data-submitted", "true").data("submitted", true);

                /** -------------------------------------------------------------- //
                
                Scroll iframe into view for all forms
                
                */

                config.nodes.iframe.scrollIntoView();

                /** -------------------------------------------------------------- //
                
                Check for a custom callback
                
                */

                if(
                    typeof(config.callback) != "undefined" && 
                    typeof(config.callback.type) != "undefined"
                ) {

                    /** -------------------------------------------------------------- //
                    
                    Type: global function
                    
                    */

                    if(config.callback.type == "global") {

                        if(typeof(config.callback.function) != "undefined") {

                            if(typeof(window[config.callback.function]) == "function") {

                                try {

                                    window[config.callback.function](config);

                                } catch(e) {
                                    console.error(e);
                                }

                            }

                        }

                    /** -------------------------------------------------------------- //
                    
                    Type: APP module
                    
                    */

                    } else if(config.callback.type == "module") {

                        if(
                            typeof(APP) != "undefined" && 
                            typeof(APP.modules) != "undefined" && 
                            typeof(config.callback.module) != "undefined" && 
                            typeof(config.callback.method) != "undefined" && 
                            typeof(APP.modules[config.callback.module] == "object")
                        ) {

                            try {

                                var callback_function = APP.modules[config.callback.module];

                                config.callback.method.forEach(function(method_name, method_index) {

                                    if(typeof(callback_function[method_name]) != "undefined") {
                                        callback_function = callback_function[method_name];
                                    }

                                });

                                if(typeof(callback_function) == "function") {

                                    callback_function(config);

                                } else {

                                    console.error("Not a function");

                                }

                            } catch(e) {
                                console.error(e);
                            }

                        }

                    }

                }

            };

            /** -------------------------------------------------------------- //
            
            Handle Messages from iframe
            
            */

            INSTANCE.on_message = function(e) {

                if(typeof(e.origin) == "undefined") { return false; }

                if(!CMS.jotform.is_permitted(e.origin, ['jotform.com', 'jotform.pro'])) { 
                    return false;
                }

                /** -------------------------------------------------------------- //
                
                Type: object
                
                */

                if(typeof(e.data) === 'object') {

                    var args = e.data;

                    if(
                        typeof(args.action) != "undefined" && 
                        typeof(args.formID) != "undefined"
                    ) {

                        // Make sure message was intended for this instance
                        if(parseInt(args.formID) != config.form_id) {
                            return;
                        }

                        switch(args.action) {

                            case "submission-completed":

                                INSTANCE.run_callbacks();

                                break;

                        }

                    }

                /** -------------------------------------------------------------- //
                
                Type: string
                
                */

                } else {

                    var args = e.data.split(":");

                    // Make sure form ID is included
                    if(args.length <= 2) { return; }

                    // Make sure message was intended for this instance
                    if(args[2] != config.form_id) {
                        return;
                    } 

                    // Make sure event is not disabled by config
                    if(
                        typeof(config.events[args[0]]) != "undefined" && 
                        config.events[args[0]]
                    ) {

                        switch(args[0]) {

                            case "scrollIntoView":
                                
                                config.nodes.iframe.scrollIntoView();
                                
                                break;

                            case "setHeight":

                                config.nodes.iframe.style.height = args[1] + "px";

                                if(
                                    !isNaN(args[1]) && 
                                    parseInt(config.nodes.iframe.style.minHeight) > parseInt(args[1])
                                ) {
                                    config.nodes.iframe.style.minHeight = args[1] + "px";
                                }
                                
                                break;

                            case "collapseErrorPage":

                                if(config.nodes.iframe.clientHeight > window.innerHeight) {
                                    config.nodes.iframe.style.height = window.innerHeight + "px";
                                }
                                
                                break;

                            case "reloadPage":

                                window.location.reload();
                                
                                break;

                            case "loadScript":

                                var src = args[1];

                                if(args.length > 3) {
                                    src = args[1] + ':' + args[2];
                                }

                                var script = document.createElement('script');
                                script.src = src;
                                script.type = 'text/javascript';
                                document.body.appendChild(script);
                                
                                break;

                            case "exitFullscreen":

                                if(window.document.exitFullscreen) {
                                    window.document.exitFullscreen();
                                } else if (window.document.mozCancelFullScreen) {
                                    window.document.mozCancelFullScreen();
                                } else if(window.document.mozCancelFullscreen) {
                                    window.document.mozCancelFullScreen();
                                } else if(window.document.webkitExitFullscreen) {
                                    window.document.webkitExitFullscreen();
                                } else if (window.document.msExitFullscreen) {
                                    window.document.msExitFullscreen();
                                }
                                
                                break;
                        }

                    }

                    var isJotForm = (e.origin.indexOf("jotform") > -1) ? true : false;

                    try {

                        if(
                            isJotForm && 
                            "contentWindow" in config.nodes.iframe && 
                            typeof(config.nodes.iframe.contentWindow) == "object" && 
                            "postMessage" in config.nodes.iframe.contentWindow
                        ) {

                            var urls = {
                                "docurl":encodeURIComponent(document.URL),
                                "referrer":encodeURIComponent(document.referrer)
                            };

                            config.nodes.iframe.contentWindow.postMessage(JSON.stringify({
                                "type":"urls",
                                "value":urls
                            }), "*");
                        }

                    } catch(e) {}

                }

            };

            /** -------------------------------------------------------------- //
            
            Init
            
            */

            INSTANCE.init = function() {

                if(config.nodes.iframe) {

                    var src = config.nodes.iframe.src;
                    var iframe_params = [];

                    if(window.location.href && window.location.href.indexOf("?") > -1) {
                        iframe_params = iframe_params.concat(window.location.href.substr(window.location.href.indexOf("?") + 1).split('&'));
                    }

                    if(src && src.indexOf("?") > -1) {
                        iframe_params = iframe_params.concat(src.substr(src.indexOf("?") + 1).split("&"));
                        src = src.substr(0, src.indexOf("?"))
                    }

                    iframe_params.push("isIframeEmbed=1");
                    config.nodes.iframe.src = src + "?" + iframe_params.join('&');

                }

                $config.attr("data-initialized", "true").data("initialized", true);

                console.log("Jotform initialized: " + config.form_id);

                CMS.jotform.cache[config.form_id] = INSTANCE;

            };

            INSTANCE.init();

            return INSTANCE;

        },

        /** -------------------------------------------------------------- //
        
        Process
        
        */

        "on_message": function(e) {

            $.each(CMS.jotform.cache, function(form_id, jotform) {

                jotform.on_message(e);

            });

        },

        /** -------------------------------------------------------------- //
        
        Check origin
        
        */

        "is_permitted": function(originUrl, whitelisted_domains) {
            var url = document.createElement('a');
            url.href = originUrl;
            var hostname = url.hostname;
            var result = false;
            if( typeof hostname !== 'undefined' ) {
                whitelisted_domains.forEach(function(element) {
                    if( hostname.slice((-1 * element.length - 1)) === '.'.concat(element) ||  hostname === element ) {
                        result = true;
                    }
                });
                return result;
            }
        }

    };

    /** -------------------------------------------------------------- //
    
    Message listeners
    
    */

    if(window.addEventListener) {

        window.addEventListener("message", function(e) {
            CMS.jotform.on_message(e);
        }, false);

    } else if(window.attachEvent) {

        window.attachEvent("onmessage", function(e) {
            CMS.jotform.on_message(e);
        });

    }

    /*

    Load global settings into `CMS` object
    ---------------------------------------------------------------

    */

    function mergeFrontendGlobals(globals) {

        // Add returned globals to CMS obj
        jQuery.extend(CMS, globals);

        // Store references to central/local asset paths
        CMS.assets = {
            central: CMS.central + 'assets',
            local: '/assets'
        }

        // Store references to central/local module paths
        CMS.modules = {
            central: CMS.central + 'modules',
            local: '/modules'
        } 

        try {

            if(
                typeof(CMS.developer.contactFormControllerRoutes) == "object" && 
                CMS.developer.contactFormControllerRoutes.length > 0
            ) {

                $.each(CMS.developer.contactFormControllerRoutes, function(i, route) {

                    if($.inArray(route, _CMS_GLOBAL_STATE_["contactforms"]["routes"]) === -1) {
                        _CMS_GLOBAL_STATE_["contactforms"]["routes"].push(route);
                    }

                });

            }

        } catch(e) {}

        try {

            // Add Cloudfront paths
            if(CMS.developer.cloudfrontDistributionURL && CMS.developer.cloudfrontRewritePaths) {
                
                for(cloudfrontRewritePathIndex in CMS.developer.cloudfrontRewritePaths) {

                    var cloudfrontRewritePath = CMS.developer.cloudfrontRewritePaths[cloudfrontRewritePathIndex];

                    if(cloudfrontRewritePath.substr(0, CMS.assets.local.length) == CMS.assets.local) {

                        CMS.assets.local = 'https://' + CMS.developer.cloudfrontDistributionURL + CMS.assets.local;

                    }

                }

            } 

        } catch(e) {}

        /*

        Modules
        ---------------------------------------------------------------

        */

        CMS.responsivecolumns();

        /** -------------------------------------------------------------- //
        
        Event Listeners
        
        */

        $(document).ready(function() {

            /** -------------------------------------------------------------- //
        
            Google Maps API
            ---

            Check if there are any uninitialized maps on the page and if so, import the maps frontend from the central core.
            This will automatically import the google API v3.
            
            */

            if($("div[data-module='map'][data-initialized!='true']").length > 0) {
                $.getScript(CMS.modules.central + '/maps/assets/frontend/js/maps.js', function() { });
            }

            /** -------------------------------------------------------------- //

            International Phone Numbers
            
            */

            var CMS_INTL_TEL_INPUTS = [];

            $('.cms-intl-tel-input').each(function() {

                var $wrapper = $(this),
                    $input = $('input', $wrapper),
                    $config = $('script[type="application/json"]', $wrapper);

                if($input.length > 0) {

                    var defaults = {
                        formatOnDisplay: true,
                        initialCountry: "us",
                        separateDialCode: true,
                        formatOnDisplay: false,
                        utilsScript: CMS.assets.central + "/js/helpers/intlTelInput/utils.js",
                        customPlaceholder: function(selectedCountryPlaceholder, selectedCountryData) {
                            return "Example: " + selectedCountryPlaceholder;
                        }
                    },
                    options = {};

                    if($config.length > 0) {

                        try {

                            options = JSON.parse($config.html());

                        } catch(e) {}

                    }

                    var config = $.extend(true, defaults, options);

                    var $display_input = $input.clone();

                    $input.addClass("cms-intl-tel-input-submit-input");
                    $input.attr("type", "hidden");
                    $input.attr("autocomplete", "off");
                    $input.attr("readonly", "true");
                    $input.hide();

                    $display_input.addClass("cms-intl-tel-input-submit-input");
                    $display_input.removeAttr("name");
                    $display_input.attr("autocomplete", "tel");

                    if(typeof($input.attr("id")) != "undefined") {

                        $display_input.attr("id", $input.attr("id") + "-intl-display");

                    }

                    $input.before($display_input);

                    CMS_INTL_TEL_INPUTS.push({
                        nodes: {
                            $wrapper: $wrapper,
                            $display_input: $display_input,
                            $submit_input: $input,
                            $config: $config
                        },
                        config: config
                    });

                }

            });

            if(CMS_INTL_TEL_INPUTS.length > 0) {

                $.getScript(CMS.assets.central + "/js/helpers/intlTelInput/intlTelInput-jquery.min.js", function() {

                    $('<link/>', {
                        rel: 'stylesheet',
                        type: 'text/css',
                        href: CMS.assets.central + "/css/helpers/intlTelInput.min.css"
                    }).appendTo('head').on('load', function() {

                        $.each(CMS_INTL_TEL_INPUTS, function(index, instance) {

                            instance.nodes.$display_input.intlTelInput(instance.config);

                            instance.nodes.$display_input.on('countrychange focus mouseenter', function(event) {

                                var placeholder = instance.nodes.$display_input.attr("placeholder"),
                                    mask = placeholder.replace("Example: ", "").replace(/[0-9]/g, 9);

                                if($.mask) {
                                    if(event.type == "countrychange") { $(this).focus().val(""); }
                                    $(this).mask(mask);
                                    if(event.type == "countrychange") { $(this)[0].setSelectionRange(0, 0); }
                                }

                            }).on('blur', function() {

                                var value = instance.nodes.$display_input.intlTelInput("getNumber");

                                instance.nodes.$submit_input.val(value);

                            });

                        });

                    });

                });

            }

        });

        ///////////////////////////////////////////////////////////////////////

        CMSFrontendFrameworkCallback(CMS);

    }

    /** -------------------------------------------------------------- //
        
    Event Listeners / Inits
    
    */

    $(document).ready(function() {

        /** -------------------------------------------------------------- //
            
        GDPR
        
        */

        if(
            (
                typeof(CMS.developer.gdprOptIn) != "undefined" && 
                CMS.developer.gdprOptIn
            ) || (
                typeof(CMS.developer.gdprOptOut) != "undefined" && 
                CMS.developer.gdprOptOut
            )
        ) {

            if($('[data-module="gdpr"]').length === 0) {

                function gdpr_nl2br(str, replaceMode, isXhtml) {
                    var breakTag = (isXhtml) ? '<br />' : '<br>';
                    var replaceStr = (replaceMode) ? '$1'+ breakTag : '$1'+ breakTag +'$2';
                    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, replaceStr);
                }

                var gdpr_type = CMS.developer.gdprOptIn ?
                                "OptIn" :
                                "OptOut";

                var gdpr_style = typeof(CMS.developer.gdprStyle) ? 
                                CMS.developer.gdprStyle : 
                                "banner";

                var gdpr_force_selection = typeof(CMS.developer.gdprForceSelection) && CMS.developer.gdprForceSelection;

                var gdpr_local_storage_key = "gdpr-" + (
                    gdpr_type == "OptOut" ? "opt-out" : "opt-in"
                );

                var gdpr_cookie_key = "_gdpr_" + (
                    gdpr_type == "OptOut" ? "opt_out" : "opt_in"
                );

                var gdpr_cookie_value = false;

                try {

                    gdpr_cookie_value = document.cookie.split(';').filter(function(c) {
                        return c.trim().indexOf(gdpr_cookie_key) !== -1;
                    }).map(function(c) {
                        return c.trim().split("=")[1];
                    })[0] == "true";

                } catch(e) {}

                var gdpr_local_storage_value = window.localStorage.getItem(gdpr_local_storage_key);

                if(!gdpr_cookie_value && !gdpr_local_storage_value) {
                    
                    var gdpr_settings = {};

                    $.each(["Heading", "Message", "AcceptButtonText", "DeclineButtonText", "AcceptHelperText", "DeclineHelperText"], function(i, key) {

                        var setting = ["gdpr", gdpr_type, key].join(""),
                            value = typeof(CMS.developer[setting]) != "undefined" ? 
                                    CMS.developer[setting] :
                                    "";

                        if(
                            $.trim(value) == "" ||
                            $.trim(value) == "null" || 
                            value == null
                        ) {
                            value = "";
                        }

                        gdpr_settings[key] = value;

                    });

                    var html = '<div id="cms-gdpr-banner" data-module="gdpr" data-gdpr-type="' + gdpr_type + '" data-gdpr-style="' + gdpr_style + '">';

                        html += '<div id="cms-gdpr-banner-wrapper">';

                            html += '<form id="cms-gdpr-banner-form" action="/modules/seo/setGDPR' + gdpr_type + 'Cookie" method="POST">';

                                html += '<input id="cms-gdpr-banner-form-return-url" type="hidden" name="return_url" value="' + window.location.pathname + '">';

                                html += '<div id="cms-gdpr-banner-flex">';

                                    html += '<div id="cms-gdpr-banner-content">';
                                        if(
                                            typeof(gdpr_settings["Heading"]) != "undefined" &&
                                            gdpr_settings["Heading"] != ""
                                        ) {
                                            html += '<div id="cms-gdpr-banner-heading">' + gdpr_settings["Heading"] + '</div>';
                                        }
                                        html += '<p>' + gdpr_nl2br(gdpr_settings["Message"]) + '</p>';
                                    html += '</div>';

                                    html += '<div id="cms-gdpr-banner-buttons">';

                                        html += '<div data-gdpr-button-wrapper="accept">';

                                            html += '<a data-gdpr-button="accept">' + gdpr_settings["AcceptButtonText"] + '</a>';

                                            if(
                                                typeof(gdpr_settings["AcceptHelperText"]) != "undefined" &&
                                                gdpr_settings["AcceptHelperText"] != ""
                                            ) {
                                                html += '<p>' + gdpr_settings["AcceptHelperText"] + '</p>';
                                            }

                                        html += '</div>';

                                        html += '<div data-gdpr-button-wrapper="decline">';

                                            html += '<a data-gdpr-button="decline">' + gdpr_settings["DeclineButtonText"] + '</a>';

                                            if(
                                                typeof(gdpr_settings["DeclineHelperText"]) != "undefined" &&
                                                gdpr_settings["DeclineHelperText"] != ""
                                            ) {
                                                html += '<p>' + gdpr_settings["DeclineHelperText"] + '</p>';
                                            }

                                        html += '</div>';

                                    html += '</div>';

                                html += '</div>';

                            html += '</form>';

                        html += '</div>';

                    html += '</div>';

                    var gdpr_html_classes = ['cms-gdpr-banner-visible', 'cms-gdpr-banner-visible--' + gdpr_style];

                    $("body").append(html);

                    if(gdpr_force_selection) {
                        gdpr_html_classes.push('cms-gdpr-banner-force-selection');
                        $("body").append('<div id="cms-gdpr-force-selection"></div>');
                    }

                    $("html").addClass(gdpr_html_classes.join(" "));

                    if($('[data-module="gdpr"]').length > 0) {

                        var $gdpr = $('[data-module="gdpr"]'),
                            $gdpr_force_selection = $('#cms-gdpr-force-selection');

                        var $form = $("#cms-gdpr-banner-form", $gdpr),
                            $accept = $("[data-gdpr-button='accept']", $gdpr),
                            $decline = $("[data-gdpr-button='decline']", $gdpr);

                        if(gdpr_type == "OptIn") {

                            $accept.unbind('click').on('click', function() {
                                $form.submit();
                            });

                            $decline.unbind('click').on('click', function() {
                                window.localStorage.setItem(gdpr_local_storage_key, "declined");
                                $gdpr_force_selection.remove();
                                $gdpr.remove();
                                $("html").removeClass(gdpr_html_classes.join(" "));
                                $(window).trigger("resize");
                            });

                        } else if(gdpr_type == "OptOut") {

                            $decline.unbind('click').on('click', function() {
                                $form.submit();
                            });

                            $accept.unbind('click').on('click', function() {
                                window.localStorage.setItem(gdpr_local_storage_key, "accepted");
                                $gdpr_force_selection.remove();
                                $gdpr.remove();
                                $("html").removeClass(gdpr_html_classes.join(" "));
                                $(window).trigger("resize");
                            });

                        }

                        $(window).resize(function() {

                            var height = 0;

                            if($gdpr.length > 0 && $gdpr.is(":visible")) {
                                height = $gdpr.outerHeight();
                            }

                            document.querySelector(":root").style.setProperty("--cms-gdpr-banner-height", height + "px");

                        }).trigger('resize');

                    }

                }

            }

        } else {

            try {
                window.localStorage.removeItem("gdpr-opt-out");
            } catch(e) {}

            try {
                window.localStorage.removeItem("gdpr-opt-in");
            } catch(e) {}

        }

        /** -------------------------------------------------------------- //
            
        Jotform
        
        */

        if($('[data-jotform-config]').length > 0) {

            $('[data-jotform-config]:not([data-initialized="true"]').each(function() {

                new CMS.jotform.init($(this));

            });

        }

        /** -------------------------------------------------------------- //
            
        CMS Tabs
        
        */

        $('[data-module="cms-tabs"]').each(function() {

            var $wrapper = $(this),
                $config = $('script[type="application/json"]', $wrapper);

            var defaults = {},
                options = {};

            if($config.length > 0) {

                try {

                    options = JSON.parse($config.html());

                } catch(e) {}

            }

            var config = $.extend(true, defaults, options);

            $wrapper.on('click', '.cms-tab-link', function() {

                var $link = $(this),
                    tab_id = $link.data("cms-tab");

                if($link.hasClass('cms-tab-link--active')) { return; }

                var $pane = $wrapper.find('.cms-tab-pane[data-cms-tab="' + tab_id + '"]');

                if($pane.length > 0) {

                    $wrapper.find('.cms-tab-link').removeClass('cms-tab-link--active');
                    $wrapper.find('.cms-tab-pane').removeClass('cms-tab-pane--active');
                    $link.addClass('cms-tab-link--active');
                    $pane.addClass('cms-tab-pane--active');

                    var $select = $('.cms-tabs-menu select', $wrapper);

                    if($select.length > 0) {
                        $select.val(tab_id);
                    }

                }

            }).on('change', '.cms-tabs-menu select', function() {

                var $option = $(this),
                    tab_id = $option.val();

                var $pane = $wrapper.find('.cms-tab-pane[data-cms-tab="' + tab_id + '"]');

                if($pane.length > 0) {

                    var $link = $('.cms-tab-link[data-cms-tab="' + tab_id + '"]', $wrapper);

                    $wrapper.find('.cms-tab-link').removeClass('cms-tab-link--active');
                    $wrapper.find('.cms-tab-pane').removeClass('cms-tab-pane--active');
                    $pane.addClass('cms-tab-pane--active');

                    if($link.length > 0) {
                        $link.addClass('cms-tab-link--active');
                    }

                }

            });

        });

        /*

        CMS Video In Textbox
        ---------------------------------------------------------------

        */

        $('p iframe[src*="youtube"],p iframe[src*="youtu.be"],p iframe[src*="vimeo"]').each(function() {

            var $iframe = $(this);

            if($iframe.closest('.cms-video').length > 0) { return; }

            var width = false,
                height = false;

            if(typeof($iframe.attr("width")) != "undefined") {
                width = parseFloat($iframe.attr("width"));
            }

            if(typeof($iframe.attr("height")) != "undefined") {
                height = parseFloat($iframe.attr("height"));
            }

            if(width && height) {

                $iframe.css("aspect-ratio", width + " / " + height);

            }

        });

        /*

        CMS Video Placeholders
        ---------------------------------------------------------------

        If a placeholder element is used on a video, this will trigger loading the "real" iframe on click

        */

        $(".cms-video-placeholder").each(function(i,v) {

            var $PLACEHOLDER = $(this),
                $VIDEO = $PLACEHOLDER.closest(".cms-video"),
                SRC = $PLACEHOLDER.data("placeholder-src"),
                FADE = typeof($PLACEHOLDER.data("placeholder-fade")) != "undefined" ? $PLACEHOLDER.data("placeholder-fade") : 500;

            $PLACEHOLDER.on('click', function() {

                var $IFRAME = $("<iframe />");
                    $IFRAME.attr("src", SRC);
                    $IFRAME.attr("allow", "autoplay; fullscreen");
                    $IFRAME.attr("scrolling", "no");

                $VIDEO.prepend($IFRAME);

                $PLACEHOLDER.fadeOut(FADE, function() {
                    $PLACEHOLDER.remove();
                });

            });

        });

        /*

        Code Embeds
        ---------------------------------------------------------------

        */

        if(_CMS_GLOBAL_STATE_.codeembed.iframe.listener) {
            clearInterval(_CMS_GLOBAL_STATE_.codeembed.iframe.listener);
        }

        _CMS_GLOBAL_STATE_.codeembed.iframe.height = {};

        if($("iframe[data-editor-code-embed-pjax]").length > 0) {

            var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

            if(MutationObserver) {

                $("iframe[data-editor-code-embed-pjax]").each(function() {

                    var $iframe = $(this),
                        $embed = $iframe.closest('[data-editor-code-embed]'),
                        id = $embed.attr("data-editor-code-embed");

                    var iframe = $iframe[0];

                    function setIframeHeight() {

                        var $wrapper = $('[data-editor-code-embed-pjax-wrapper]', iframe.contentDocument);

                        if($wrapper.closest('html').length > 0) {
                            $wrapper = $wrapper.closest('html');
                        }

                        var newHeight = $wrapper.outerHeight();

                        $iframe.height(newHeight);

                    }

                    window.addEventListener('resize', setIframeHeight);

                    iframe.contentWindow.addEventListener('click', setIframeHeight);

                    iframe.addEventListener('load', function() {

                        setIframeHeight();

                        setTimeout(function() {
                            setIframeHeight();
                        }, 500);

                        var target = iframe.contentDocument.body;

                        var observer = new MutationObserver(function(mutations) {
                            setIframeHeight();
                        });

                        observer.observe(target, {
                            attributes: true,
                            childList: true,
                            characterData: true,
                            subtree: true
                        });

                        setTimeout(function() {

                            $('a[href*="reviewability"]', $(target)).not("a[target]").each(function() {

                                if(typeof(this.href) != "undefined" && this.href.indexOf("javascript") == -1) {

                                    if(this.href.indexOf(location.hostname) == -1) {
                                        if(this.href.indexOf("mailto:") == -1 && this.href.indexOf("tel:") == -1 && this.href.indexOf("sms:") == -1) {
                                            $(this).attr("target", "_blank").addClass("cms-external-link");
                                            if($(this).attr("title") === undefined) { $(this).attr("title", "External Link | " + $(this).attr("href")); }
                                        }
                                    }

                                }

                                if(typeof($(this).attr("href")) != "undefined") {

                                    if($(this).attr("href").substr(0, "/file/".length) == "/file/") {
                                        var title = typeof($(this).data("filename")) == "undefined" ? "" : " | " + $(this).data("filename");
                                        $(this).attr("target", "_blank").addClass("cms-external-link");
                                        if($(this).attr("title") === undefined) { $(this).attr("title", "File" + title); }
                                    }

                                }

                                // Reverse tabnabbing hardening: pair every target="_blank"
                                // we add with rel="noopener" so the opened page can't
                                // script window.opener (cyborg-t217)
                                if($(this).attr("target") === "_blank") {
                                    var rel = $(this).attr("rel") || "";
                                    if(rel.toLowerCase().indexOf("opener") === -1) { $(this).attr("rel", $.trim(rel + " noopener")); }
                                }

                            });

                        }, 500);

                    });

                });

            } else {

                $("iframe[data-editor-code-embed-pjax]").each(function() {

                    var $iframe = $(this),
                        $embed = $iframe.closest('[data-editor-code-embed]'),
                        id = $embed.attr("data-editor-code-embed");

                    _CMS_GLOBAL_STATE_.codeembed.iframe.height[id] = 0;

                });

                _CMS_GLOBAL_STATE_.codeembed.iframe.listener = setInterval(function() {

                    $("iframe[data-editor-code-embed-pjax]").each(function() {

                    var $iframe = $(this),
                        $embed = $iframe.closest('[data-editor-code-embed]'),
                        $body = $iframe.contents().find('body'),
                        id = $embed.attr("data-editor-code-embed");

                        current_height = $body.outerHeight();

                        try {
                            current_height += parseFloat($body.css("margin-top").replace("px", ""));
                        } catch(e) {}

                        try {
                            current_height += parseFloat($body.css("margin-bottom").replace("px", ""));
                        } catch(e) {}

                        try {
                            current_height += parseFloat($body.css("padding-top").replace("px", ""));
                        } catch(e) {}

                        try {
                            current_height += parseFloat($body.css("padding-bottom").replace("px", ""));
                        } catch(e) {}
                        
                        if(current_height != _CMS_GLOBAL_STATE_.codeembed.iframe.height[id]) {
                    
                            $iframe.height((_CMS_GLOBAL_STATE_.codeembed.iframe.height[id] = current_height));
                            
                        }

                    });

                }, 500);

            }

        }

        /** -------------------------------------------------------------- //
        
        Accessibility Widget Detect
        
        */

        var _CMS_ACCESSIBILITY_WIDGET_DETECT = setInterval(function() {

            try {

                if($('.userway_p5').length > 0 && $('.userway_p5').is(":visible")) {

                    $("html")
                        .addClass("has-accessibility-widget")
                        .addClass("has-accessibility-widget--userway");

                }

                if($('.asw-widget').length > 0 && $('.asw-widget').is(":visible")) {

                    $("html")
                        .addClass("has-accessibility-widget")
                        .addClass("has-accessibility-widget--caw");

                }

            } catch(e) {}

        }, 500);

        setTimeout(function() {
            clearInterval(_CMS_ACCESSIBILITY_WIDGET_DETECT);
        }, 3000);

    });

    /** -------------------------------------------------------------- //
        
    Load Frontend Globals
    
    */

    var inline_globals = false;

    try {

        var $inline_globals = $('script[data-frontend-globals-pjax]');

        if($inline_globals.length === 0) { $inline_globals = $('script[data-frontend-globals]'); }

        if($inline_globals.length > 0) {

            inline_globals = JSON.parse($inline_globals.html());

        }

    } catch(e) {}

    if(inline_globals) {

        mergeFrontendGlobals(inline_globals);

    } else {

        $.post("/modules/settings/get/getFrontendGlobals", { page: page },
            function(globals) {

                mergeFrontendGlobals(globals);

        }, 'json');

    }

}


function properties_exist(obj, find, dev) {

    if(typeof(dev) === "undefined") { dev = false; }

    if(typeof(obj) === "undefined") { return false; } else { if(dev) { console.log("`obj` exists"); } }
    if(typeof(find) === "undefined") { return false; } else { if(dev) { console.log("`obj` exists"); } }

    $.each(find, function(i, v) {

        if(v.indexOf("/") === -1) {

            if(typeof(obj[v]) === "undefined") { return false; } else { if(dev) { console.log("`" + v + "` exists"); } }

        } else {

            var ex = v.split("/"),
                path = obj[ex[0]];

            $.each(ex, function(ii, vv) {

                if(ii > 0) {

                    if(typeof(path[vv]) === "undefined") { return false; } else { if(dev) { console.log("`" + vv + "` exists"); } }

                    path = path[vv];

                }

            });

        }

    });

    return true;

}
