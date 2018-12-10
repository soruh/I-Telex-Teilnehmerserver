"use strict";
const UNIXTIMEDATE = false;
const SHOWALLDATEINFO = false;
const DEFAULTLANGUAGE = "german";
const SORTNUMERIC = false;
let global_list = [];
let pwdcorrect = false;
let global_password = null;
let sortby = "";
let reverseSort = false;
let language;
// tslint:disable:no-var-keyword
var english;
var german;
// tslint:enable:no-var-keyword
const languages = {
    german,
    english,
};
$(document).ready(function () {
    $('#cookie-prompt-buttons').children().click(function () {
        $("#cookie-prompt").hide();
        setCookieAllowed($(this).hasClass('yes'));
        processCookieQueue();
    });
    if (getCookie('allow-cookies') === '1') {
        console.log('cookies are allowed');
        allowCookies = true;
    }
    setLanguage(getCookie("language") || DEFAULTLANGUAGE);
    /*$.validator.setDefaults({
          errorLabelContainer: "#errorpop_errmsg",
          wrapper: "p",
          invalidHandler: function(form, validator) {
              showError();
          }
      });*/
    $.validator.methods.ipaddress = matchIp;
    $.validator.methods.hostname = matchHn;
    $.validator.methods.unique = checkUnique;
    $(function () {
        const keyStop = {
            //  8: ":not(input:text, textarea, input:file, input:password)", // stop backspace = back
            13: "input:text, input:password",
            end: null,
        };
        $(".popup").bind("keydown", function (event) {
            const selector = keyStop[event.which];
            if (selector !== undefined && $(event.target).is(selector)) {
                event.preventDefault(); // stop event
                $(event.target).parent().parent().find(".submit_dialog")[0].click();
            }
            return true;
        });
    });
    $.fn.extend({
        // tslint:disable-next-line:object-literal-shorthand
        center: function () {
            return this.each(function () {
                let top = $(window).scrollTop() + (($(window).height() - $(this).outerHeight()) / 2); // (($(window).height() - $(this).outerHeight()) / 2);
                let left = $(window).scrollLeft() + (($(window).width() - $(this).outerWidth()) / 2);
                $(this).css({
                    position: 'absolute',
                    margin: 0,
                    top: (top > 0 ? top : 0) + 'px',
                    left: (left > 0 ? left : 0) + 'px',
                });
            });
        },
    });
    $.ajaxSetup({ /*async: false*/});
    $(document).ajaxStart(() => {
        $("#waitpop").show();
        $("#waitpop").center();
    });
    $(document).ajaxStop(() => {
        $("#waitpop").hide();
    });
    login("", () => {
        initloc();
        $("#table_th_arrow_name").click();
    });
    $("input,select,textarea")
        .bind("checkval", function () {
        if ($(this).val() !== "" /*||$(this).next("label.validate_error").length==1*/) {
            $(this).prev("label").addClass("gl_label_filled");
        }
        else {
            $(this).prev("label").removeClass("gl_label_filled");
            $(this).parents(".field--wrapper").removeClass("gl_missing");
        }
    })
        .on("change", function () {
        $(this).trigger("checkval");
    })
        .on("keyup", function () {
        $(this).trigger("checkval");
    })
        .on("focus", function () {
        $(this).prev("label").addClass("gl_label_focus");
    })
        .on("blur", function () {
        $(this).prev("label").removeClass("gl_label_focus");
        if ($(this).val() !== "" && $(this).parents(".field--wrapper").hasClass("gl_required")) {
            $(this).parents(".field--wrapper").addClass("gl_missing");
        }
        else {
            $(this).parents(".field--wrapper").removeClass("gl_missing");
        }
    })
        .trigger("checkval");
    $("#search-box").val("");
    $("#search-box").bind("search", function () {
        updateContent(global_list);
    });
    $("#search-box")
        .on("change", function () {
        $(this).trigger("search");
    })
        .on("keyup", function () {
        $(this).trigger("search");
    })
        .on("focus", function () {
        getList();
    });
    $("#refresh-button").click(function () {
        refresh();
    });
    // $("#search-button").on("click", function () {
    //     $("#search-box").fadeToggle();
    //     $("#search-box").focus();
    // });
    $("#login").click(function () {
        showpopup("password_dialog", function () {
            $("#passwordfield").focus();
        });
    });
    $("#new").click(function () {
        $("#type_newentry_dialog").trigger('change');
        showpopup("newentry_dialog");
    });
    $("#type_newentry_dialog").on('change', function () {
        let type = optionType(this);
        if (type === "hostname") {
            $("#hostname_newentry_dialog").parent().show();
            $("#ipaddress_newentry_dialog").parent().hide();
            $("#email_newentry_dialog").parent().hide();
        }
        else if (type === "ipaddress") {
            $("#hostname_newentry_dialog").parent().hide();
            $("#ipaddress_newentry_dialog").parent().show();
            $("#email_newentry_dialog").parent().hide();
        }
        else if (type === "email") {
            $("#hostname_newentry_dialog").parent().hide();
            $("#ipaddress_newentry_dialog").parent().hide();
            $("#email_newentry_dialog").parent().show();
        }
    });
    $("#type_edit_dialog").on('change', function () {
        let type = optionType(this);
        if (type === "hostname") {
            $("#hostname_edit_dialog").parent().show();
            $("#ipaddress_edit_dialog").parent().hide();
            $("#email_edit_dialog").parent().hide();
        }
        else if (type === "ipaddress") {
            $("#hostname_edit_dialog").parent().hide();
            $("#ipaddress_edit_dialog").parent().show();
            $("#email_edit_dialog").parent().hide();
        }
        else if (type === "email") {
            $("#hostname_edit_dialog").parent().hide();
            $("#ipaddress_edit_dialog").parent().hide();
            $("#email_edit_dialog").parent().show();
        }
    });
    $("#submit_password_dialog").click(function () {
        let formId = "#password_form";
        validatePasswordDialog(formId);
        if ($(formId).valid()) {
            login($("#passwordfield").val().toString(), function (successful) {
                if (successful) {
                    resetforms();
                }
                else {
                    window.alert(languages[language]["#wrongpwd"].text);
                }
            });
        }
        $("#passwordfield").val("");
        $("#passwordfield").trigger('change');
        // getList(updateTable);
    });
    $("#submit_newentry_dialog").click(function () {
        let formId = "#newentry_form";
        validateNewDialog(formId);
        $("#type_newentry_dialog").on('change', function () {
            $(formId).valid();
        });
        if ($(formId).valid()) {
            let editParams = {
                job: "new",
                number: $("#number_newentry_dialog").val(),
                name: $("#name_newentry_dialog").val(),
                type: $("#type_newentry_dialog").val(),
                hostname: "",
                ipaddress: "",
                port: $("#port_newentry_dialog").val(),
                extension: $("#extension_newentry_dialog").val(),
                timestamp: $("#timestamp_newentry_dialog").val(),
                pin: $("#pin_newentry_dialog").val(),
                disabled: $("#disabled_newentry_dialog").prop('checked') ? 1 : 0,
            };
            switch (optionType(formId + " select[name=type]")) {
                case "ipaddress":
                    editParams.ipaddress = $("#ipaddress_newentry_dialog").val().toString();
                    break;
                case "hostname":
                    editParams.hostname = $("#hostname_newentry_dialog").val().toString();
                    break;
                case "email":
                    editParams.hostname = $("#email_newentry_dialog").val().toString();
                    break;
            }
            edit(editParams, function (err, res) {
                if (err) {
                    console.error(err);
                }
                else {
                    console.log("edit res:", res);
                    resetforms();
                }
            });
            // getList(updateTable);
        }
    });
    $("#submit_edit_dialog").click(function () {
        let formId = "#edit_form";
        validateEditDialog(formId);
        $("#type_edit_dialog").on('change', function () {
            $(formId).valid();
        });
        if ($(formId).valid()) {
            editOrCopy('edit');
        }
    });
    $("#copy_edit_dialog").click(function () {
        let formId = "#edit_form";
        validateEditDialog(formId);
        $("#type_edit_dialog").on('change', function () {
            $(formId).valid();
        });
        if ($(formId).valid()) {
            editOrCopy('copy');
        }
    });
    $("#submit_delete_dialog").click(function () {
        edit({
            job: "delete",
            uid: $("#delete_dialog").data("uid"),
        }, function (err, res) {
            if (err) {
                console.error(err);
            }
            else {
                console.log("edit res:", res);
                resetforms();
            }
        });
        // getList(updateTable);
    });
    $("#submit_resetPin_dialog").click(function () {
        edit({
            job: "resetPin",
            uid: $("#resetPin_dialog").data("uid"),
        }, function (err, res) {
            if (err) {
                console.error(err);
            }
            else {
                console.log("edit res:", res);
                resetforms();
            }
        });
        // getList(updateTable);
    });
    $(".abort_dialog").click(function () {
        resetforms();
        // getList(updateTable);
    });
});
const FIELD_ORDER = ["number", "name", "extension", "address", "port", "type", "disabled", "timestamp"];
function sortFields(a, b) {
    return FIELD_ORDER.indexOf(a[0]) - FIELD_ORDER.indexOf(b[0]);
}
function checkUnique(number, element /*|HTMLElement*/) {
    console.log("checking if " + number + " is unique");
    let uid = $($(element).parents()[2]).data("uid");
    console.log('uid: ' + uid);
    for (let entry of global_list) {
        if (
        // tslint:disable:triple-equals
        entry.type != 0 &&
            entry.number == number &&
            entry.uid != uid
        // tslint:enable:triple-equals
        ) {
            console.log('number is not unique');
            return false;
        }
    }
    console.log('number is unique');
    return true;
}
function editOrCopy(action) {
    let editParams = {
        job: action,
        uid: $("#edit_dialog").data("uid"),
        number: $("#number_edit_dialog").val(),
        name: $("#name_edit_dialog").val(),
        type: $("#type_edit_dialog").val(),
        hostname: "",
        ipaddress: "",
        port: $("#port_edit_dialog").val(),
        extension: $("#extension_edit_dialog").val(),
        timestamp: $("#timestamp_edit_dialog").val(),
        pin: $("#pin_edit_dialog").val(),
        disabled: $("#disabled_edit_dialog").prop('checked') ? 1 : 0,
    };
    switch (optionType("#edit_dialog select[name=type]")) {
        case "ipaddress":
            editParams.ipaddress = $("#ipaddress_edit_dialog").val().toString();
            break;
        case "hostname":
            editParams.hostname = $("#hostname_edit_dialog").val().toString();
            break;
        case "email":
            editParams.hostname = $("#email_edit_dialog").val().toString();
            break;
    }
    edit(editParams, function (err, res) {
        if (err) {
            console.error(err);
        }
        else {
            console.log(action + " res:", res);
            resetforms();
        }
    });
    // getList(updateTable);
}
function optionType(select) {
    let val = +$(select).val();
    if (val === 1 || val === 3)
        return "hostname";
    if (val === 2 || val === 4 || val === 5)
        return "ipaddress";
    if (val === 6)
        return "email";
}
/*
function clearErrors() {
  closeError();
  $(".gl_error").removeClass("gl_error");
  $(".gl_fielderror").remove();
}

function showError(errorMessage) {
  if (errorMessage) $('#errorpop_errmsg').html(errorMessage);
  $('#errorpop').show(1, function () {
    $('#errorpop').center();
    $('#errorpop').hide();
    $('#errorpop').fadeIn("slow");
  });
}

function closeError() {
  $('#errorpop').fadeOut("slow");
}
*/
function showpopup(id, callback) {
    $("#newentry_dialog").hide();
    $("#edit_dialog").hide();
    $("#delete_dialog").hide();
    $("#resetPin_dialog").hide();
    $("#password_dialog").hide();
    if (id === "") {
        $("#edit_dialog").data("uid", "");
        $("#delete_dialog").data("uid", "");
        $("#resetPin_dialog").data("uid", "");
    }
    else {
        $("#" + id).show(1, function () {
            $("#" + id).center();
            $("#" + id).hide();
            $("#" + id).fadeIn(350);
            setTimeout(function (id) {
                $($("#" + id).children().find("input")[0]).focus();
            }, 0, id);
        });
    }
    if (typeof callback === "function")
        callback();
}
function resetforms() {
    $("#newentry_dialog input").val("");
    $("#newentry_dialog checkbox").prop("checked", false);
    $("#delete_dialog_label_container div").remove();
    $("#resetPin_dialog_label_container div").remove();
    showpopup("");
}
function login(pwd, callback) {
    if (pwd)
        global_password = pwd;
    edit({
        job: "confirm password",
    }, function (err, res) {
        pwdcorrect = (res.code === 1);
        refresh(() => {
            if (typeof callback === "function")
                callback(res.code === 1);
        });
    });
}
function logout() {
    global_password = null;
    login();
    resetforms();
}
function twodigit(n) {
    // n = n.toString();
    // return n.length < 2?"0"+n:n;
    return n.toString().padStart(2, '0');
}
function UNIXTIMEToString(UNIXTIME) {
    let d = new Date(parseInt(UNIXTIME) * 1000);
    if (SHOWALLDATEINFO) {
        return (d.toString());
    }
    else {
        if (language === "english")
            return (twodigit(d.getMonth() + 1) + "." + twodigit(d.getDate()) + "." + d.getFullYear() + " " +
                twodigit(((d.getHours() > 12) ? (d.getHours() - 12) : d.getHours())) +
                ":" + twodigit(d.getMinutes()) +
                ((d.getHours() > 12) ? " PM" : "AM"));
        return (twodigit(d.getDate()) + "." + twodigit(d.getMonth() + 1) + "." + d.getFullYear() + " " + twodigit(d.getHours()) + ":" + twodigit(d.getMinutes()));
    }
}
function getList(callback) {
    console.log('getList');
    getToken('', (token, salt) => {
        $.ajax({
            url: "/list",
            type: "POST",
            dataType: "json",
            data: {
                token,
                salt,
            },
            success(response) {
                if (response.successful) {
                    let { result } = response;
                    for (let key in result) { // combine hostname and ipaddress into address
                        const row = result[key];
                        const address = row.hostname || row.ipaddress;
                        row.address = address;
                        delete row.hostname;
                        delete row.ipaddress;
                        // TODO: replace with better solution, beacuse objects don't have a key order
                        const sortedEntries = Object.entries(row).sort(sortFields);
                        let sortedRow = {};
                        for (const field of sortedEntries) {
                            sortedRow[field[0]] = field[1];
                        }
                        result[key] = sortedRow;
                    }
                    global_list = result;
                }
                else {
                    console.error(response.message);
                }
                if (typeof callback === "function")
                    callback(global_list);
            },
            error(error) {
                console.log(error);
                callback(null);
            },
        });
    });
}
function findByUid(uid, list = global_list) {
    return list.find((value) => value.uid === uid);
}
function updateTable(list, callback) {
    let table = $("#table");
    table.children().filter(".tr.hr").remove();
    let headerRow = $("<div></div>");
    $(headerRow).addClass("tr hr");
    for (let key in list[0] || {}) {
        if (key !== "uid") {
            let headerCell = $("<div></div>");
            headerCell.addClass("th cell cell_" + key);
            let label = $("<div></div>");
            label.addClass("table-th-label locale_" + key);
            label.attr("id", "table_th_label_" + key);
            if (key === "disabled") {
                let icon_ban_circle = $("<div></div>");
                $(icon_ban_circle).addClass("glyphicon glyphicon-ban-circle disabled");
                label.append(icon_ban_circle);
            }
            headerCell.append(label);
            let arrow = $("<div></div>");
            arrow.addClass("table_th_arrow glyphicon glyphicon-chevron-down");
            arrow.attr("id", "table_th_arrow_" + key);
            arrow.click(function () {
                let clicked = $(this);
                let [, , , name] = clicked.attr('id').split('_');
                if (sortby !== name) {
                    $(".table_th_arrow").removeClass("selected rotated");
                    clicked.addClass("selected");
                    sortby = name;
                    reverseSort = false;
                }
                else {
                    if (reverseSort) {
                        clicked.removeClass("rotated");
                        reverseSort = false;
                    }
                    else {
                        clicked.addClass("rotated");
                        reverseSort = true;
                    }
                }
                // console.log("sortby:",sortby, "revsort:",revsort, "selected:",clicked.hasClass("selected")," rotated:",clicked.hasClass("rotated"));
                updateContent(global_list);
            });
            headerCell.append(arrow);
            headerRow.append(headerCell);
        }
    }
    table.append(headerRow);
    updateContent(list, () => {
        if (callback)
            callback();
    });
}
function updateContent(unSortedList, callback) {
    let list = search(sort(unSortedList), $("#search-box").val().toString());
    let table = $("#table");
    table.children().filter(".tr").not(".hr").remove();
    for (let entry of list) {
        let row = $("<div></div>");
        row.addClass("tr");
        for (let key in entry) {
            if (key !== "uid") {
                let cell = $("<div></div>");
                cell.addClass("td cell cell_" + key);
                switch (key) {
                    case "timestamp":
                        if (UNIXTIMEDATE) {
                            cell.text(entry[key]);
                        }
                        else {
                            cell.text(UNIXTIMEToString(entry[key]));
                        }
                        break;
                    case "disabled":
                        if (entry[key] === 1) {
                            let div = $("<div></div>");
                            div.addClass("glyphicon glyphicon-ban-circle disabled");
                            cell.append(div);
                            // $(cell).addClass("glyphicon glyphicon-ok-circle");
                        }
                        else {
                            // $(cell).addClass("glyphicon glyphicon-remove-circle");
                        }
                        break;
                    case "type":
                        try {
                            cell.addClass("type_option_" + entry[key]);
                        }
                        catch (e) {
                            cell.text(entry[key]);
                        }
                        break;
                    case "hostname":
                    case "ipaddress":
                        let link = $("<a></a>");
                        link.text(entry[key]);
                        link.addClass('link');
                        link.attr('href', 'http://' + entry[key]);
                        cell.append(link);
                        break;
                    case "extension":
                        cell.text(entry[key]);
                        break;
                    default:
                        cell.text(entry[key]);
                }
                row.append(cell);
            }
        }
        // tslint:disable:align
        let modify_container = $("<div></div>");
        modify_container.addClass("td cell admin_only");
        let edit = $("<div></div>");
        // edit.addClass("td");
        let span = $("<span></span>");
        span.addClass("btn  btn-primary btn-sm glyphicon glyphicon-pencil edit");
        span.data("uid", entry.uid);
        edit.append(span);
        edit.addClass("edit_td");
        modify_container.append(edit);
        let resetPin = $("<div></div>");
        // edit.addClass("td");
        span = $("<span></span>");
        span.addClass("btn  btn-warning btn-sm glyphicon glyphicon-repeat resetPin");
        span.data("uid", entry.uid);
        resetPin.append(span);
        resetPin.addClass("resetPin_td");
        modify_container.append(resetPin);
        let remove = $("<div></div>");
        // remove.addClass("td");
        span = $("<span></span>");
        span.addClass("btn btn-danger btn-sm glyphicon glyphicon-trash remove");
        span.data("uid", entry.uid);
        remove.append(span);
        remove.addClass("remove_td");
        modify_container.append(remove);
        row.append(modify_container);
        table.append(row);
        // tslint:enable:align
    }
    $(".edit").click(editButtonClick);
    $(".resetPin").click(resetPinButtonClick);
    $(".remove").click(removeButtonClick);
    updateLoc();
    if (pwdcorrect) {
        $('body').addClass('admin_mode');
        $(".admin_only").show();
        $(".user_only").hide();
    }
    else {
        $('body').removeClass('admin_mode');
        $(".admin_only").hide();
        $(".user_only").show();
    }
    if (callback)
        callback();
}
function editButtonClick() {
    $("#type_edit_dialog").trigger('change');
    $("#edit_dialog").data("uid", $(this).data("uid"));
    let uid = $(this).data("uid");
    getList(list => {
        updateTable(list);
        let entry = findByUid(uid);
        if (!entry)
            return console.error('uid ' + uid + ' not found');
        $("#number_edit_dialog").val(entry.number).trigger('change');
        $("#name_edit_dialog").val(entry.name).trigger('change');
        $("#type_edit_dialog").val(entry.type).trigger('change');
        if (entry.type === 6) {
            $("#email_edit_dialog").val(entry.address).trigger('change');
        }
        else {
            $("#hostname_edit_dialog").val(entry.address).trigger('change');
        }
        $("#ipaddress_edit_dialog").val(entry.address).trigger('change');
        $("#port_edit_dialog").val(entry.port).trigger('change');
        $("#extension_edit_dialog").val(entry.extension).trigger('change');
        // $("#pin_edit_dialog").val(entry.pin).trigger('change');
        $("#disabled_edit_dialog").prop('checked', entry.disabled).trigger('change');
        showpopup("edit_dialog");
    });
}
function removeButtonClick() {
    $("#delete_dialog_label_container div").remove();
    let uid = $(this).data("uid");
    $("#delete_dialog").data("uid", uid);
    let deleteMessage = {
        id: "message_delete_dialog_label",
        class: "delete_dialog_label",
        text: languages[language].delete_message,
    };
    $('<div/>', deleteMessage).appendTo("#delete_dialog_label_container");
    getList(list => {
        updateTable(list);
        let entry = findByUid(uid);
        if (!entry)
            return console.error('uid ' + uid + ' not found');
        for (let k in entry) {
            let deleteDialogLabel = {
                id: k + "_delete_dialog_label",
                class: "delete_dialog_label",
                text: null,
            };
            if (k === "timestamp" && (!UNIXTIMEDATE)) {
                deleteDialogLabel.text = k + ": " + UNIXTIMEToString(entry[k]);
            }
            else if (k !== "uid") {
                deleteDialogLabel.text = k + ": " + entry[k];
            }
            $('<div/>', deleteDialogLabel).appendTo("#delete_dialog_label_container");
        }
        showpopup("delete_dialog");
    });
}
function resetPinButtonClick() {
    $("#resetPin_dialog_label_container div").remove();
    let uid = $(this).data("uid");
    $("#resetPin_dialog").data("uid", uid);
    let resetPinMessage = {
        id: "message_resetPin_dialog_label",
        class: "resetPin_dialog_label",
        text: languages[language].resetPinMessage,
    };
    $('<div/>', resetPinMessage).appendTo("#resetPin_dialog_label_container");
    getList(list => {
        updateTable(list);
        let entry = findByUid(uid);
        if (!entry)
            return console.error('uid ' + uid + ' not found');
        for (let k in entry) {
            let resetPinDialogLabel = {
                id: k + "_resetPin_dialog_label",
                class: "resetPin_dialog_label",
                text: null,
            };
            if (k === "timestamp" && (!UNIXTIMEDATE)) {
                resetPinDialogLabel.text = k + ": " + UNIXTIMEToString(entry[k]);
            }
            else if (k !== "uid") {
                resetPinDialogLabel.text = k + ": " + entry[k];
            }
            $('<div/>', resetPinDialogLabel).appendTo("#resetPin_dialog_label_container");
        }
        showpopup("resetPin_dialog");
    });
}
function validateEditDialog(formId) {
    $(formId).validate({
        highlight(element, errorClass, validClass) {
            $(element).parents("div.control-group").addClass(errorClass).removeClass(validClass);
            $(element).trigger("checkval");
        },
        unhighlight(element, errorClass, validClass) {
            $(element).parents(".error").removeClass(errorClass).addClass(validClass);
            $(element).trigger("checkval");
        },
        errorClass: "validate_error",
        validClass: "validate_valid",
        rules: {
            type: {
                required: true,
                digits: true,
                min: 1,
            },
            pin: {
                required: true,
                max: 65535,
            },
            extension: {
                digits: true,
                max: 99,
            },
            port: {
                required: {
                    depends(element) {
                        let type = optionType(formId + " select[name=type]");
                        return type !== "email";
                    },
                },
                max: 65535,
                digits: true,
            },
            name: {
                required: true,
                maxlength: 40,
            },
            number: {
                unique: true,
                required: true,
                digits: true,
                max: 4294967295,
            },
            email: {
                email: true,
                maxlength: 40,
                required: {
                    depends(element) {
                        let type = optionType(formId + " select[name=type]");
                        return type === "email";
                    },
                },
            },
            hostname: {
                hostname: true,
                maxlength: 40,
                required: {
                    depends(element) {
                        let type = optionType(formId + " select[name=type]");
                        return (type === "hostname");
                    },
                },
            },
            ipaddress: {
                ipaddress: true,
                required: {
                    depends(element) {
                        let type = optionType(formId + " select[name=type]");
                        return (type === "ipaddress");
                    },
                },
            },
        },
    });
}
function validateNewDialog(formId) {
    $(formId).validate({
        highlight(element, errorClass, validClass) {
            $(element).parents("div.control-group").addClass(errorClass).removeClass(validClass);
            $(element).addClass("bg-danger field_error");
            // $("#newentry_dialog").center();
        },
        unhighlight(element, errorClass, validClass) {
            $(element).parents(".error").removeClass(errorClass).addClass(validClass);
            $(element).removeClass("bg-danger field_error");
            // $("#newentry_dialog").center();
        },
        errorClass: "validate_error",
        validClass: "validate_valid",
        rules: {
            pin: {
                required: true,
                max: 65535,
            },
            extension: {
                digits: true,
                max: 99,
            },
            port: {
                required: {
                    depends(element) {
                        let type = optionType(formId + " select[name=type]");
                        return (type !== "email");
                    },
                },
                max: 65535,
                digits: true,
            },
            name: {
                required: true,
                maxlength: 40,
            },
            number: {
                unique: true,
                required: true,
                digits: true,
                max: 4294967295,
            },
            email: {
                email: true,
                maxlength: 40,
                required: {
                    depends(element) {
                        let type = optionType(formId + " select[name=type]");
                        return (type === "email");
                    },
                },
            },
            hostname: {
                hostname: true,
                maxlength: 40,
                required: {
                    depends(element) {
                        let type = optionType(formId + " select[name=type]");
                        return (type === "hostname");
                    },
                },
            },
            ipaddress: {
                ipaddress: true,
                required: {
                    depends(element) {
                        let type = optionType(formId + " select[name=type]");
                        return (type === "ipaddress");
                    },
                },
            },
        },
    });
}
function validatePasswordDialog(formId) {
    $(formId).validate({
        highlight(element, errorClass, validClass) {
            $(element).parents("div.control-group").addClass(errorClass).removeClass(validClass);
            $(element).addClass("bg-danger field_error");
        },
        unhighlight(element, errorClass, validClass) {
            $(element).parents(".error").removeClass(errorClass).addClass(validClass);
            $(element).removeClass("bg-danger field_error");
        },
        errorClass: "validate_error",
        validClass: "validate_valid",
        rules: {
            password: {
                required: true,
            },
        },
    });
}
function refresh(callback) {
    getList(list => {
        updateTable(list, () => {
            if (callback)
                callback();
        });
    });
}
function edit(values, callback) {
    console.log('edit', values);
    const data = JSON.stringify(values);
    console.log('edit data:', data);
    getToken(data, (token, salt) => {
        $.ajax({
            url: "/edit",
            type: "POST",
            data: {
                data,
                token,
                salt,
            },
            success(response) {
                if ((response.message.code !== 1) && (response.message.code !== -1) && ($("#log").length === 1))
                    $("#log").text(JSON.stringify(response.message));
                if (!response.successful) {
                    console.log(response.message);
                }
                refresh(() => {
                    if (callback)
                        callback(null, response.message);
                });
            },
            error(error) {
                console.error(error);
                if ($("#log").length === 1)
                    $("#log").text(JSON.stringify(error));
                if (callback)
                    callback(error, null);
            },
        });
    });
}
function search(list, pattern) {
    if (pattern === "")
        return list;
    console.log(`searching for: '${pattern}'`);
    let result = list
        .filter(row => {
        return pattern.split(" ")
            .map(word => {
            for (let [key, value] of Object.entries(row)) {
                if (new RegExp(word, "gi").test((key === "timestamp") && (!UNIXTIMEDATE) ?
                    UNIXTIMEToString(row[key]) :
                    value))
                    return true;
            }
            return false;
        })
            .reduce((accumulator, value) => accumulator && value);
    });
    console.log(`pattern matches ${result.length}/${list.length} entries`);
    return result;
}
function sortFunction(x, y) {
    x = (x[sortby] || '').toString();
    y = (y[sortby] || '').toString();
    return x.localeCompare(y, 'de', {
        numeric: SORTNUMERIC,
    });
}
function sort(unSortedList) {
    if (sortby === '')
        return unSortedList;
    console.log(`sorting by ${sortby}`);
    if (!(sortby in unSortedList[0])) {
        console.error(`${sortby} is not a collumn name!`);
        sortby = '';
        return unSortedList;
    }
    let sortedList = unSortedList.sort(sortFunction);
    if (reverseSort) {
        return sortedList.reverse();
    }
    else {
        return sortedList;
    }
}
function initloc() {
    $("#loc-dropdown-parent").click(function () {
        $("#loc-dropdown-children").fadeToggle(300);
    });
    for (let languageName in languages) {
        let child = $("<div></div>");
        child.attr("id", `loc-dropdown-child-${languageName}`);
        child.css("background-image", `url(/images/${languageName}.svg)`);
        child.click(function () {
            setLanguage(this.id.split("-")[this.id.split("-").length - 1]);
            $("#loc-dropdown-children").fadeOut(300);
        });
        $("#loc-dropdown-children").append(child);
    }
}
function setLanguage(lang) {
    if (languages.hasOwnProperty(lang)) {
        language = lang;
        if (getCookie("language") !== "" || language !== DEFAULTLANGUAGE)
            setCookie("language", lang, 365 * 10);
        $("#loc-dropdown-parent").css("background-image", "url(/images/" + lang + ".svg)");
        updateContent(global_list);
    }
}
function updateLoc() {
    let currentLanguage = languages[language];
    for (let identifier in currentLanguage) {
        let element = currentLanguage[identifier];
        for (let name in element) {
            let value = element[name];
            switch (name) {
                case "html":
                    $(identifier).html(value);
                    break;
                case "text":
                    $(identifier).text(value);
                    break;
                default:
                    $(identifier).prop(name, value);
            }
        }
    }
    $.extend($.validator.messages, currentLanguage.verify);
}
function createHash(salt, data) {
    // console.log('creating Hash: salt='+salt+' password='+global_password+' data='+data);
    const hash = window['forge_sha256'](salt + global_password + data);
    // console.log('created Hash: '+hash);
    return hash;
}
function getToken(data, callback) {
    $.ajax({
        url: "/getSalt",
        type: "GET",
        success(response) {
            // console.log(response);
            if (response.successful) {
                const { salt } = response;
                // console.log(`got salt: ${salt}`);
                const hash = createHash(salt, data);
                // console.log(`created hash: ${hash}`);
                callback(hash, salt);
            }
            else {
                console.error(response.message);
            }
        },
        error(error) {
            console.error(error);
            if ($("#log").length === 1)
                $("#log").text(JSON.stringify(error));
        },
    });
}
let cookieQueue = [];
function processCookieQueue() {
    while (cookieQueue.length > 0) {
        setCookie(...cookieQueue.pop());
    }
}
let allowCookies = null;
function setCookieAllowed(allowed) {
    if (allowed) {
        allowCookies = true;
        setCookie('allow-cookies', '1', 365 * 10);
    }
    else {
        allowCookies = false;
    }
}
const setCookie = function setCookieWrapper(c_name, value, exdays) {
    if (allowCookies === true) {
        console.log(`setting cookie: "${c_name}"="${value}" exdays:${exdays}`);
        _setCookie(c_name, value, exdays);
    }
    else if (allowCookies === null) {
        cookieQueue.push([c_name, value, exdays]);
        $('#cookie-prompt').show();
    }
    else {
        console.warn(`not setting cookie: "${c_name}"="${value}" exdays:${exdays}`);
    }
};
function _setCookie(c_name, value, exdays) {
    let exdate = new Date();
    exdate.setDate(exdate.getDate() + exdays);
    let c_value = escape(value) + (exdays == null ? "" : "; expires=" + exdate.toUTCString());
    document.cookie = c_name + "=" + c_value;
}
function getCookie(c_name) {
    let cookies = document.cookie.split(";");
    for (let cookie of cookies) {
        let [name, value] = cookie.split("=");
        if (name.trim() === c_name)
            return unescape(value);
    }
    return "";
}
function matchHn(str) {
    console.log("matching hostname:" + str);
    return (/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/
        .test(str));
}
function matchIp(str) {
    console.log("matching ip:" + str);
    return (
    // /(^\s*((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\s*$)|(^\s*( (([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$)/
    /(^\s*((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\s*$)/
        .test(str));
}
