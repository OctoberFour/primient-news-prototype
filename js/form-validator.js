/**
 * Form Validator
 */
var FORM_VALIDATOR = function($FORM, OPTIONS) {

	if(typeof($FORM) == "undefined") { console.log("No Form Argument"); return false; }
	if(typeof(OPTIONS) == "undefined") { OPTIONS = {}; }

	/**
	 * Configure options and default option fallbacks
	 */
	var DEFAULTS = {
		"fill": false,
		"nodes": {
			"submit": $(".contact-form-submit", $FORM),
			"loading": $(".contact-form-loading-icon", $FORM),
			"message": $(".contact-form-message", $FORM),
		},
		"onValid": function(CONFIG) {},
		"onInvalid": function(INVALID_ELEMENTS, MESSAGE) {},
		"messages": {
			"validating": "Sending contact form...",
			"required_fields": "Please fill in all required fields.",
			"invalid_email": "E-mail address is invalid.",
			"invalid_password": "Password is invalid.",
			"success": "Your message has been sent!",
			"unknown_error": "Unknown error."
		}
	};

	OPTIONS = $.extend({}, DEFAULTS, OPTIONS);

	var EXTEND_JSON = $("script[type='application/json']", $FORM),
		EXTEND = EXTEND_JSON.length > 0 ? JSON.parse($.trim(EXTEND_JSON.html())) : false;

	if(EXTEND) { OPTIONS = $.extend(true, OPTIONS, EXTEND); }

	/**
	 * Store instance for return value
	 */
	var MODULE = {};

	/**
	 * Store block ID
	 */
	var BLOCK_ID = $FORM.data("block");

	/**
	 * Message
	 */
	var MESSAGE_TIMEOUT = null;
	var MESSAGE = function(MESSAGE, TYPE, TIMEOUT) {

		if(typeof(MESSAGE) == "undefined") { MESSAGE = ""; }
		if(typeof(TYPE) == "undefined") { TYPE = "loading"; }
		if(typeof(TIMEOUT) == "undefined") { TIMEOUT = false; }

		clearTimeout(MESSAGE_TIMEOUT);

		var CLASSES = ['loading', 'success', 'error'];

		$FORM.removeClass(CLASSES.join(" ")).addClass(TYPE);

		OPTIONS["nodes"]["message"].show().html(MESSAGE);

        if(MESSAGE == "") {
            OPTIONS["nodes"]["message"].hide();
        }

		if(TIMEOUT) {

			MESSAGE_TIMEOUT = setTimeout(function() {

				$FORM.removeClass(CLASSES.join(" "))
				OPTIONS["nodes"]["message"].html("").hide();

			}, TIMEOUT);

		}

	};

	/**
	 * Initialize
	 */
	var INIT = function() {

		CONDITIONALS["init"]();

		if(OPTIONS["fill"]) {

			$(".form-item", $FORM).each(function(i, DIV) {

				var $ELEMENT = $("input,textarea,select", DIV).first();

				if($ELEMENT.is(":visible")) {

					if($ELEMENT.is(".checkbox-group input")) {

						var $GROUP = $ELEMENT.closest('.checkbox-group'),
							$INPUTS = $("input", $GROUP),
							SIZE = $INPUTS.length,
							RANDOM = Math.floor(Math.random() * SIZE) + 1;

						$INPUTS.each(function(i, v) {

							if(i < RANDOM) {
								$(this).prop("checked", true).trigger('change');
							}

						});

					} else if($ELEMENT.is(".radio-group input")) {

						$ELEMENT.prop("checked", true).trigger('change');

					} else if($ELEMENT.is("select")) {

						var SELECTED_OPTION = "";

						$("option", $ELEMENT).each(function() {

							var VAL = $.trim($(this).val());

							if(VAL != "") {
								SELECTED_OPTION = VAL;
							}

						});

						$ELEMENT.val(SELECTED_OPTION).trigger('change');

					} else {

						var RANDOM_STRING = Math.random().toString(36).slice(2);

						if($ELEMENT.data("email")) { RANDOM_STRING += "@test.com"; }
						if($ELEMENT.data("mask")) { RANDOM_STRING = $ELEMENT.data("mask"); }

						$ELEMENT.val(RANDOM_STRING).trigger('keyup');

					}

				}

			});

		}

		// Submit Button Click
		OPTIONS["nodes"]["submit"].on('click', function(event) {

			event.preventDefault();

			MODULE["validate"]();

		});

		// Submit on enter keydown
		$("input:not([type='checkbox']):not([type='radio'])", $FORM).on('keydown', function(event) {

			if(event && event.keyCode && event.keyCode == 13) {
				event.preventDefault();
				MODULE["validate"]();
			}

		});

		// Clear invalid on change
		$FORM.on('change keyup', '.form-invalid', function(event) {

			$(this).removeClass("form-invalid");

			if($(".form-invalid", $FORM).length === 0) {

                MESSAGE("", "success");

            }

		});

		// Apply MaskedInput masks
		$("input[data-mask], textarea[data-mask]", $FORM).each(function(i,v) {
			var input = $(this);
			input.mask(input.data("mask").toString());
		});

        // Validate file inputs
        $FORM.on('change', 'input[type="file"]', function(e) {

            var $element = $(this),
                input = $element[0];

            if(input.files && input.files.length > 0) {

                $.each(input.files, function(file_index, file) {

                    if($element.data("max-size")) {

                        var max_size_megabytes = parseInt($element.data("max-size"));

                        if(max_size_megabytes > 0) {

                            if(file.size > (max_size_megabytes * 1048576)) {

                                MESSAGE("The selected file is over " + max_size_megabytes + "mb!  Please choose a smaller file.", "error");

                                $element.addClass("form-invalid");

                            }

                        }

                    }

                });

            }

        });

	};

	/**
	 * Check for blanks / unchecked
	 */
	var CHECK = {

		"from": function(ON_SUCCESS) {

			if(typeof(ON_SUCCESS) == "undefined") { ON_SUCCESS = function() {}; }

			var $NAME_ELEMENT = $("[data-name='true']", $FORM),
				$EMAIL_ELEMENT = $("[data-email='true']", $FORM);

			var NAME = "",
				EMAIL = $EMAIL_ELEMENT.val();

			if($NAME_ELEMENT.length > 1) {

				var MULTI = "";

				$NAME_ELEMENT.each(function(i,v) {
					MULTI = MULTI + $(this).val();
					if(i < $NAME_ELEMENT.length - 1) { MULTI = MULTI + " "; }
				});

				NAME = MULTI;

			} else {
				NAME = $NAME_ELEMENT.val();
			}

			ON_SUCCESS({
				"name": {
					"element": $NAME_ELEMENT,
					"string": NAME
				},
				"email": {
					"element": $EMAIL_ELEMENT,
					"string": EMAIL
				}
			});

		},

		"blanks": function(ON_SUCCESS) {

			if(typeof(ON_SUCCESS) == "undefined") { ON_SUCCESS = function() {}; }

			var INVALID_ELEMENTS = [];

			$("[data-required]:visible", $FORM).each(function(i, ELEMENT) {

				var $ELEMENT = $(ELEMENT),
					INVALID = false;

				if($ELEMENT.is(".checkbox-group")) {

					var REQUIRED = parseInt($ELEMENT.data("required"));

					if(isNaN(REQUIRED)) { REQUIRED = 1; }

					if($("input[type='checkbox']:checked", $ELEMENT).length < REQUIRED) { INVALID = true; }

				} else if($ELEMENT.is(".radio-group")) {

					if($("input[type='radio']:checked", $ELEMENT).length == 0) { INVALID = true; }

				} else if($ELEMENT.is("[type='checkbox']")) {

					if(!$ELEMENT.is(":checked")) { INVALID = true; }

				} else if($ELEMENT.is("select")) {

					if($.trim($ELEMENT.val()) == "" || $.trim($ELEMENT.val()) == "null") { INVALID = true; }

				} else {

					if($.trim($ELEMENT.val()) == "") { INVALID = true; }

				}

				if(INVALID) {

					$ELEMENT.addClass("form-invalid");

					INVALID_ELEMENTS.push($ELEMENT);

				}

			});

			if(INVALID_ELEMENTS.length > 0) {

				MESSAGE(OPTIONS["messages"]["required_fields"], "error");
				OPTIONS["onInvalid"](INVALID_ELEMENTS, OPTIONS["messages"]["required_fields"]);

			} else {

				ON_SUCCESS();

			}

		},

		"email": function(FROM, ON_SUCCESS) {

			if(typeof(FROM) == "undefined") { FROM = {}; }
			if(typeof(ON_SUCCESS) == "undefined") { ON_SUCCESS = function() {}; }

			if(FROM["email"]["element"].length > 0 && FROM["email"]["element"].is(":visible")) {

				var REGEX = /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/;

				if(FROM["email"]["string"].match(REGEX)) {

					ON_SUCCESS();

				} else {

					MESSAGE(OPTIONS["messages"]["invalid_email"], "error");
					FROM["email"]["element"].addClass("form-invalid");

					OPTIONS["onInvalid"]([FROM["email"]["element"]], OPTIONS["messages"]["invalid_email"]);

				}

			} else {
				ON_SUCCESS();
			}

		},

        "files": function(ON_SUCCESS) {

            var invalid_count = 0;

            $('input[type="file"]', $FORM).each(function() {

                var $element = $(this),
                    input = $element[0];

                if(input.files && input.files.length > 0) {

                    $.each(input.files, function(file_index, file) {

                        if($element.data("max-size")) {

                            var max_size_megabytes = parseInt($element.data("max-size"));

                            if(max_size_megabytes > 0) {

                                if(file.size > (max_size_megabytes * 1048576)) {

                                    if(invalid_count == 0) {

                                        MESSAGE("The selected file is over " + max_size_megabytes + "mb!  Please choose a smaller file.", "error");

                                        $element.addClass("form-invalid");

                                        invalid_count++;

                                    }

                                }

                            }

                        }

                    });

                }

            });

            if(invalid_count === 0) {
                ON_SUCCESS();
            }

        }

	};

	/**
	 * Conditional Fields
	 */
	 var CONDITIONALS = {

 		"init": function() {

 			var $TRIGGERS = $("[data-conditional]", $FORM),
 				$CONDITIONS = $("[data-condition]", $FORM);

 			$CONDITIONS.hide();

			$TRIGGERS.each(function() {

				var $TRIGGER = $(this);

				if($TRIGGER.is("input[type='radio']")) {

					var $CONDITION = $CONDITIONS.filter("[data-condition='" + $TRIGGER.data("conditional") + "']");

					$("[name='" + $TRIGGER.attr("name") + "']", $FORM).not("[data-conditional='" + $TRIGGER.data("conditional") + "']").not($TRIGGER).on('change', function() {

						if($(this).is(":checked")) {
							$CONDITION.slideUp(200, function() {
		 						$("input,textarea,select", $CONDITION).val(function() {
		 							return this.defaultValue;
		 						});
		 					});
						}

					});

				}

	 			$TRIGGER.on('change keyup', function(event) {

	 				var $CONDITION = $CONDITIONS.filter("[data-condition='" + $TRIGGER.data("conditional") + "']");

	 				TOGGLE = true;

	 				if($TRIGGER.is("[type='checkbox']") || $TRIGGER.is("[type='radio']")) {

	 					if(!$TRIGGER.is(":checked")) {

	 						TOGGLE = false;

	 					}

	 				} else {

	 					var VAL = $.trim($TRIGGER.val());

	 					if($.inArray(VAL, ["", "null"]) !== -1) {

	 						TOGGLE = false;

	 					}

	 				}

	 				if(TOGGLE) {
	 					$CONDITION.slideDown(200);
	 				} else {
	 					$CONDITION.slideUp(200, function() {
	 						$("input,textarea,select", $CONDITION).val(function() {
	 							return this.defaultValue;
	 						});
	 					});
	 				}

	 			});

			});

 		}

 	};

	/**
	 * Run Validator
	 */
	MODULE["validate"] = function(custom_onvalid) {

		MESSAGE(OPTIONS["messages"]["validating"]);

		$(".form-invalid", $FORM).removeClass("form-invalid");

		CHECK["from"](function(FROM) {

			CHECK["blanks"](function() {

                CHECK["files"](function() {

                    CHECK["email"](FROM, function() {

                        MESSAGE("", "success");

                        var SERIALIZED = $FORM.serializeArray();

                        var TRANSFORM_SERIALIZED = Array();

                        $.each(SERIALIZED, function(i, ITEM) {

                            if(typeof(ITEM["name"]) != "undefined" && ITEM["name"] != "") {
                                TRANSFORM_SERIALIZED.push(ITEM);
                            }

                        });

                        SERIALIZED = TRANSFORM_SERIALIZED;

                        var data = {
                            "block_id": BLOCK_ID,
                            "from": {
                                "name": FROM["name"]["string"],
                                "email": FROM["email"]["string"]
                            },
                            "serialized": SERIALIZED,
                            "messages": OPTIONS["messages"]
                        };

                        if(typeof(custom_onvalid) == "function") {

                            custom_onvalid(data, OPTIONS);

                        } else {

                            OPTIONS["onValid"](data, OPTIONS);

                        }

                    });

                });

			});

		});

	};

	/**
	 * Display Custom Success Message (If enabled)
	 */
	MODULE["customSuccessMessage"] = function($TARGET) {

		if(typeof($TARGET) == "undefined") { var $TARGET = $FORM; }

		CMS.block.get(BLOCK_ID, function(BLOCK) {

			if(typeof(BLOCK["settings"]["Form Success Message"]) != "undefined") {

				var $SUCCESS = $("<div />");
					$SUCCESS.hide().addClass("contact-form-success-message");

				$SUCCESS.height($FORM.outerHeight('height')).html(BLOCK["data"][0]["html"]);

				$TARGET.before($SUCCESS);
				$TARGET.hide();

				$SUCCESS.show();

                $("html,body").animate({ scrollTop: $SUCCESS.offset().top }, 200);

			}

		});

	};

	/**
	 * Public message method
	 */
	MODULE["message"] = function(MSG, TYPE, TIMEOUT) {

		if(typeof(MSG) == "undefined") { MSG = ""; }
		if(typeof(TYPE) == "undefined") { TYPE = "loading"; }
		if(typeof(TIMEOUT) == "undefined") { TIMEOUT = false; }

		MESSAGE(MSG, TYPE, TIMEOUT);

	};

	INIT();

	MODULE.config = OPTIONS;

	return MODULE;

}
