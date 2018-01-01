"use strict";
/*1: peer able to support the “texting baudot” protocol, accessible by a host name (known by official DNS servers)
2: peer able to support the “texting baudot” protocol, accessible by a given IP address (IPv4)
3: peer only supporting “ascii texting” (or a standard telnet client), accessible by a host name (known by official DNS servers)
4: peer only supporting “ascii texting” (or a standard telnet client), accessible by a given IP address (IPv4)
5: same as 2, but IP address may change frequently
6: not a real peer, but an “official” email address.*/
var UTCDATE = false;
var SHOWALLDATEINFO = false;
var DEFAULTLANGUAGE = "german";

var global_list = {};
var pwdcorrect = false;
var sortby= "";
var revsort = false;

const languages = {
  german:{
    "#table_th_label_rufnummer":{text:"telex-nummer"},
    "#table_th_label_name":{text:"name"},
    "#table_th_label_typ":{text:"typ"},
    "#table_th_label_hostname":{text:"hostname"},
    "#table_th_label_ipaddresse":{text:"ipaddresse"},
    "#table_th_label_port":{text:"port"},
    "#table_th_label_extension":{text:"durchwahl"},
    "#table_th_label_pin":{text:"pin"},
    "#table_th_label_gesperrt":{title:"gesperrt"},
    "#table_th_label_moddate":{text:"letzte Änderung"},
    "#search-box":{placeholder:"suchen"},
    "#new":{text:"neuer eintrag"},
    ".edit":{title:"bearbeiten"},
    ".remove":{title:"entfernen"},
    "#login":{text:"einloggen"},
    "#logout":{text:"ausloggen"},
    ".abort_dialog":{text:"abbrechen"},
    ".submit_dialog":{text:"absenden"},
    "#wrongpwd":{text:"Falsches Passwort!"},
    ".typ_option_0":{text:"gelöscht (0)"},
    ".typ_option_1":{text:"Hostname Baudot (1)"},
    ".typ_option_2":{text:"Ip Baudot (2)"},
    ".typ_option_3":{text:"Hostname Ascii (3)"},
    ".typ_option_4":{text:"Ip Ascii (4)"},
    ".typ_option_5":{text:"DynIp Baudot (5)"},
    ".typ_option_6":{text:"“offizielle” E-mail (6)"},
    "#passwordfield_label":{text:"passwort"},
    "#rufnummer_newentry_dialog_label":{text:"telex-nummer"},
    "#name_newentry_dialog_label":{text:"name"},
    "#typ_newentry_dialog_label":{text:"typ"},
    "#hostname_newentry_dialog_label":{text:"hostname"},
    "#ipaddresse_newentry_dialog_label":{text:"ipaddresse"},
    "#port_newentry_dialog_label":{text:"port"},
    "#durchwahl_newentry_dialog_label":{text:"durchwahl"},
    "#pin_newentry_dialog_label":{text:"pin"},
    "#gesperrt_newentry_dialog_label":{text:"gesperrt"},
    "#rufnummer_edit_dialog_label":{text:"telex-nummer"},
    "#name_edit_dialog_label":{text:"name"},
    "#typ_edit_dialog_label":{text:"typ"},
    "#hostname_edit_dialog_label":{text:"hostname"},
    "#ipaddresse_edit_dialog_label":{text:"ipaddresse"},
    "#port_edit_dialog_label":{text:"port"},
    "#durchwahl_edit_dialog_label":{text:"durchwahl"},
    "#pin_edit_dialog_label":{text:"pin"},
    "#gesperrt_edit_dialog_label":{text:"gesperrt"},
    "#email_edit_dialog_label":{text:"E-mail"},
    "#email_newentry_dialog_label":{text:"E-mail"},
    "#hl_password":{text:"Einloggen"},
    "#hl_newentry":{text:"Neuer Eintrag"},
    "#hl_edit":{text:"Bearbeiten"},
    "#hl_delete":{text:"Löschen"},
    "delete_message":"Wollen sie diesen Eintrag wirklich löschen?",
    "verify":{
      unique: "Bitte sie eine noch nicht vorhandene Nummer ein.",
      required: "Dieses Feld ist ein Pflichtfeld.",
      email: "Bitte geben sie eine gültige E-mail addresse ein.",
      ipaddress: "Bitte geben sie eine gültige Ip-addresse ein.",
      hostname: "Bitte geben sie einen gültigen Hostnamen ein.",
      number: "Bitte geben sie eine gültige Zahl ein.",
      digits: "Bitte geben sie nur Ziffern ein.",
      maxlength: jQuery.validator.format("Bitte geben sie nicht mehr als {0} Zeichen ein."),
      minlength: jQuery.validator.format("Bitte geben sie mindestens {0} Zeichen ein."),
      rangelength: jQuery.validator.format("Bitte geben sie einen Wert zwischen {0} und {1} Zeichen ein"),
      range: jQuery.validator.format("Bitte geben sie einen Wert zwischen {0} und {1} ein."),
      max: jQuery.validator.format("Bitte geben sie einen Wert kleiner als oder gleich {0} ein."),
      min: jQuery.validator.format("Bitte geben sie einen Wert größer als oder gleich {0} ein."),
    }
  },
  english:{
    "#table_th_label_rufnummer":{text:"telex-number"},
    "#table_th_label_name":{text:"name"},
    "#table_th_label_typ":{text:"type"},
    "#table_th_label_hostname":{text:"hostname"},
    "#table_th_label_ipaddresse":{text:"ipaddress"},
    "#table_th_label_port":{text:"port"},
    "#table_th_label_extension":{text:"extension"},
    "#table_th_label_pin":{text:"pin"},
    "#table_th_label_gesperrt":{title:/*"locked"*/"disabled"},
    "#table_th_label_moddate":{text:"last changed"},
    "#search-box":{placeholder:"search"},
    "#new":{text:"new entry"},
    ".edit":{title:"edit"},
    ".remove":{title:"remove"},
    "#login":{text:"log in"},
    "#logout":{text:"log out"},
    ".abort_dialog":{text:"abort"},
    ".submit_dialog":{text:"submit"},
    "#wrongpwd":{text:"Wrong password!"},
    ".typ_option_0":{text:"deleted (0)"},
    ".typ_option_1":{text:"hostname baudot (1)"},
    ".typ_option_2":{text:"ip baudot (2)"},
    ".typ_option_3":{text:"hostname ascii (3)"},
    ".typ_option_4":{text:"ip ascii (4)"},
    ".typ_option_5":{text:"DynIp baudot (5)"},
    ".typ_option_6":{text:"“official” e-mail (6)"},
    "#passwordfield_label":{text:"password"},
    "#rufnummer_newentry_dialog_label":{text:"telex-number"},
    "#name_newentry_dialog_label":{text:"name"},
    "#typ_newentry_dialog_label":{text:"type"},
    "#hostname_newentry_dialog_label":{text:"hostname"},
    "#ipaddresse_newentry_dialog_label":{text:"ipaddress"},
    "#port_newentry_dialog_label":{text:"port"},
    "#durchwahl_newentry_dialog_label":{text:"extension"},
    "#pin_newentry_dialog_label":{text:"pin"},
    "#gesperrt_newentry_dialog_label":{text:/*"locked"*/"disabled"},
    "#rufnummer_edit_dialog_label":{text:"telex-number"},
    "#name_edit_dialog_label":{text:"name"},
    "#typ_edit_dialog_label":{text:"type"},
    "#hostname_edit_dialog_label":{text:"hostname"},
    "#ipaddresse_edit_dialog_label":{text:"ipaddress"},
    "#port_edit_dialog_label":{text:"port"},
    "#durchwahl_edit_dialog_label":{text:"extension"},
    "#pin_edit_dialog_label":{text:"pin"},
    "#gesperrt_edit_dialog_label":{text:/*"locked"*/"disabled"},
    "#email_edit_dialog_label":{text:"e-mail"},
    "#email_newentry_dialog_label":{text:"e-mail"},
    "#hl_password":{text:"log in"},
    "#hl_newentry":{text:"new entry"},
    "#hl_edit":{text:"edit"},
    "#hl_delete":{text:"delete"},
    "delete_message":"do you really want to delete this entry?",
    "verify":{
      unique: "Please enter a unique telex-number.",
      required: "This field is required.",
      email: "Please enter a valid email address.",
      ipaddress: "Please enter a valid ipaddress.",
      hostname: "Please enter a valid hostname.",
      number: "Please enter a valid number.",
      digits: "Please enter only digits.",
      maxlength: jQuery.validator.format("Please enter no more than {0} characters."),
      minlength: jQuery.validator.format("Please enter at least {0} characters."),
      rangelength: jQuery.validator.format("Please enter a value between {0} and {1} characters long."),
      range: jQuery.validator.format("Please enter a value between {0} and {1}."),
      max: jQuery.validator.format("Please enter a value less than or equal to {0}."),
      min: jQuery.validator.format("Please enter a value greater than or equal to {0}.")
    }
  }
};
var language;


$(document).ready(function(){
  setLanguage(getCookie("language")?getCookie("language"):DEFAULTLANGUAGE);
  /*jQuery.validator.setDefaults({
		errorLabelContainer: "#errorpop_errmsg",
		wrapper: "p",
		invalidHandler: function(form, validator) {
	        showError();
		}
	});*/
  $.validator.methods.ipaddress = matchIp;
  $.validator.methods.hostname = matchHn;
  $.validator.methods.unique = checkUnique;
  $(function(){
    var keyStop = {
    //  8: ":not(input:text, textarea, input:file, input:password)", // stop backspace = back
      13: "input:text, input:password", // stop enter = submit
      end: null
    };
    $(".popup").bind("keydown", function(event){
      var selector = keyStop[event.which];
      if(selector !== undefined && $(event.target).is(selector)) {
        event.preventDefault(); //stop event
        $(event.target).parent().parent().find(".submit_dialog")[0].click();
      }
      return true;
    });
  });
  (function($){
    $.fn.extend({
      center: function () {
          return this.each(function() {
              var top = $(window).scrollTop()+(($(window).height() - $(this).outerHeight()) / 2);
              var left = $(window).scrollLeft()+(($(window).width() - $(this).outerWidth()) / 2);
              $(this).css({position:'absolute', margin:0, top: (top > 0 ? top : 0)+'px', left: (left > 0 ? left : 0)+'px'});
          });
      }
    });
  })(jQuery);
  $.ajaxSetup({/*async: false*/});
  $(document).ajaxStart(function(){
  	$("#waitpop").show();
  	$("#waitpop").center();
  });
  $(document).ajaxStop(function(){
  	$("#waitpop").hide();
  });
  login("",function(){
    initloc();
  });

  jQuery("input,select,textarea").bind("checkval",function(){
    if(jQuery(this).val() !== ""/*||jQuery(this).next("label.validate_error").length==1*/){
      jQuery(this).prev("label").addClass("gl_label_filled");
    }else{
      jQuery(this).prev("label").removeClass("gl_label_filled");
      jQuery(this).parents(".field--wrapper").removeClass("gl_missing");
    }
  }).on("change",function(){
    jQuery(this).trigger("checkval");
  }).on("keyup",function(){
    jQuery(this).trigger("checkval");
  }).on("focus",function(){
    jQuery(this).prev("label").addClass("gl_label_focus");
  }).on("blur",function(){
      jQuery(this).prev("label").removeClass("gl_label_focus");
      if(jQuery(this).val() !== "" && jQuery(this).parents(".field--wrapper").hasClass("gl_required")){
      	jQuery(this).parents(".field--wrapper").addClass("gl_missing");
      }else{
      	jQuery(this).parents(".field--wrapper").removeClass("gl_missing");
		}
  }).trigger("checkval");

  $("#search-box").val("");
  jQuery("#search-box").bind("search",function(){
    updateContent(global_list);
  });
  $("#search-box").on("change",function(){
    jQuery(this).trigger("search");
  }).on("keyup",function(){
    jQuery(this).trigger("search");
  }).on("focus",function(){
    getList();
  })
  $("#search-button").on("click",function(){
    $("#search-box").fadeToggle();
  });
  $("#login").click(function(){
    showpopup("password_dialog", function(){
      $("#passwordfield").focus();
    })
  });
  $("#new").click(function(){
    $("#typ_newentry_dialog").trigger('change');
    showpopup("newentry_dialog");
  });
  $("#typ_newentry_dialog").on('change',function(){
      var type = optionType(this);
      if(type == "hostname"){
        $("#hostname_newentry_dialog").parent().show();
        $("#ipaddresse_newentry_dialog").parent().hide();
        $("#email_newentry_dialog").parent().hide();
      }else if(type == "ipaddress"){
        $("#hostname_newentry_dialog").parent().hide();
        $("#ipaddresse_newentry_dialog").parent().show();
        $("#email_newentry_dialog").parent().hide();
      }else if(type=="email"){
        $("#hostname_newentry_dialog").parent().hide();
        $("#ipaddresse_newentry_dialog").parent().hide();
        $("#email_newentry_dialog").parent().show();
      }
    });
  $("#typ_edit_dialog").on('change',function(){
    var type = optionType(this);
    if(type == "hostname"){
      $("#hostname_edit_dialog").parent().show();
      $("#ipaddresse_edit_dialog").parent().hide();
      $("#email_edit_dialog").parent().hide();
    }else if(type == "ipaddress"){
      $("#hostname_edit_dialog").parent().hide();
      $("#ipaddresse_edit_dialog").parent().show();
      $("#email_edit_dialog").parent().hide();
    }else if(type=="email"){
      $("#hostname_edit_dialog").parent().hide();
      $("#ipaddresse_edit_dialog").parent().hide();
      $("#email_edit_dialog").parent().show();
    }
  });
  $("#submit_password_dialog").click(function(){
    var formId="#password_form";
    $(formId).validate({
      highlight: function(element, errorClass, validClass){
        $(element).parents("div.control-group").addClass(errorClass).removeClass(validClass);
        jQuery(element).addClass("bg-danger field_error");
      },
      unhighlight: function(element, errorClass, validClass){
        $(element).parents(".error").removeClass(errorClass).addClass(validClass);
        jQuery(element).removeClass("bg-danger field_error");
      },
      errorClass: "validate_error",
      validClass: "validate_valid",
      rules:{
        password:{
          required: true
        }
      }
    });
    if($("#passwordfield").valid()){
      login($("#passwordfield").val(),function(successful){
        if(successful){
          resetforms();
        }else{
          showError(languages[language]["#wrongpwd"].text);
        }
      });
    }
    $("#passwordfield").val("");
    $("#passwordfield").trigger('change');
    //getList(updateTable);
  });
  $("#submit_newentry_dialog").click(function(){
    var formId="#newentry_form";
    $(formId).validate({
      highlight: function(element, errorClass, validClass){
        $(element).parents("div.control-group").addClass(errorClass).removeClass(validClass);
        jQuery(element).addClass("bg-danger field_error");
        // $("#newentry_dialog").center();
      },
      unhighlight: function(element, errorClass, validClass){
        $(element).parents(".error").removeClass(errorClass).addClass(validClass);
        jQuery(element).removeClass("bg-danger field_error");
        // $("#newentry_dialog").center();
      },
      errorClass: "validate_error",
      validClass: "validate_valid",
      rules:{
        pin:{
          required: true
        },
        durchwahl:{
          digits: true
        },
        port:{
          required: {
            depends: function(element){
              var type = optionType(formId+" select[name=typ]");  //TODO
              return(type!="email");
            }
          },
          digits:true
        },
        name:{
          required: true
        },
        rufnummer:{
          unique: true,
          required: true,
          digits:true
        },
        email:{
          email:true,
          required:{
            depends: function(element){
              var type = optionType(formId+" select[name=typ]");
              return(type=="email");
            }
          }
        },
        hostname:{
          hostname:true,
          required:{
            depends: function(element){
              var type = optionType(formId+" select[name=typ]");
              return(type=="hostname");
            }
          }
        },
        ipaddresse:{
          ipaddress:true,
          required: {
            depends: function(element){
              var type = optionType(formId+" select[name=typ]");
              return(type=="ipaddress");
            }
          }
        }
      }
    });
    $("#typ_newentry_dialog").on('change',function(){
      $("#newentry_form").valid();
    });
    if($("#newentry_form").valid()){
      var editParams = {
        typekey:"new",
        rufnummer: $("#rufnummer_newentry_dialog").val(),
        name: $("#name_newentry_dialog").val(),
        typ: $("#typ_newentry_dialog").val(),
        hostname: "",
        ipaddresse: "",
        port: $("#port_newentry_dialog").val(),
        extension: $("#durchwahl_newentry_dialog").val(),
        moddate: $("#moddate_newentry_dialog").val(),
        pin: $("#pin_newentry_dialog").val(),
      }
      editParams.gesperrt = $("#gesperrt_newentry_dialog").prop('checked') ? 1 : 0;
      switch(optionType(formId+" select[name=typ]")){
        case "ipaddress":
          editParams.ipaddresse = $("#ipaddresse_newentry_dialog").val();
          break;
        case "hostname":
          editParams.hostname = $("#hostname_newentry_dialog").val();
          break;
        case "email":
          editParams.hostname = $("#email_newentry_dialog").val();
          break;
      }
      edit(editParams,function(res,err){
        console.log(res,err);
        if(err){
          console.log(err);
        }else{
          resetforms();
        }
      });
      //getList(updateTable);
    }
  });
  $("#submit_edit_dialog").click(function(){
    var formId="#edit_form";
    $(formId).validate({
      highlight: function(element, errorClass, validClass){
        $(element).parents("div.control-group").addClass(errorClass).removeClass(validClass);
        $(element).trigger("checkval");
      },
      unhighlight: function(element, errorClass, validClass){
        $(element).parents(".error").removeClass(errorClass).addClass(validClass);
        $(element).trigger("checkval");
      },
      errorClass: "validate_error",
      validClass: "validate_valid",
      rules:{
        typ:{
          required: true,
          digits: true,
          min: 1
        },
        durchwahl:{
          digits: true
        },
        port:{
          required: true,
          digits:true
        },
        name:{
          required: true
        },
        rufnummer:{
          unique: true,
          required: true,
          digits:true
        },
        email:{
          email:true,
          required:{
            depends: function(element){
              var type = optionType(formId+" select[name=typ]");
              return(type=="email");
            }
          }
        },
        hostname:{
          hostname:true,
          required:{
            depends: function(element){
              var type = optionType(formId+" select[name=typ]");
              return(type=="hostname");
            }
          }
        },
        ipaddresse:{
          ipaddress:true,
          required: {
            depends: function(element){
              var type = optionType(formId+" select[name=typ]");
              return(type=="ipaddress");
            }
          }
        }
      }
    });
    $("#typ_edit_dialog").on('change',function(){
      $("#edit_form").valid();
    });
    if($("#edit_form").valid()){
      console.log("uid: "+$("#edit_dialog").data("uid"));
      var editParams = {
        typekey:"edit",
        uid: $("#edit_dialog").data("uid"),
        rufnummer: $("#rufnummer_edit_dialog").val(),
        name: $("#name_edit_dialog").val(),
        typ: $("#typ_edit_dialog").val(),
        hostname: "",
        ipaddresse: "",
        port: $("#port_edit_dialog").val(),
        extension: $("#durchwahl_edit_dialog").val(),
        moddate: $("#moddate_edit_dialog").val(),
        pin: $("#pin_edit_dialog").val(),
      };
      editParams.gesperrt = $("#gesperrt_edit_dialog").prop('checked') ? 1 : 0;
      switch(optionType(formId+" select[name=typ]")){
        case "ipaddress":
          editParams.ipaddresse = $("#ipaddresse_edit_dialog").val();
          break;
        case "hostname":
          editParams.hostname = $("#hostname_edit_dialog").val();
          break;
        case "email":
          editParams.hostname = $("#email_edit_dialog").val();
          break;
      }
      edit(editParams,function(res,err){
        console.log(res,err);
        if(err){
          console.log(err);
        }else{
          resetforms();
        }
      });
      //getList(updateTable);
    }
  });
  $("#submit_delete_dialog").click(function(){
    edit({
      typekey:"delete",
      uid:$("#delete_dialog").data("uid"),
    },function(res,err){
      console.log(res,err);
      if(err){
        console.log(err);
      }else{
        resetforms();
      }
    });
    //getList(updateTable);
  });
  $(".abort_dialog").click(function(){
    resetforms();
    //getList(updateTable);
  });
});
function checkUnique(value,element){
  var uid = $($(element).parents()[2]).data("uid")?$($(element).parents()[2]).data("uid"):false;
  var isUnique = true;
  for(let k in global_list){
    if((global_list[k].rufnummer == value)&&((!uid)||(global_list[k].uid != uid))&&(global_list[k].typ!=0)){
      isUnique = false;
    }
  }
  return(isUnique);
}
function optionType(select){
  var val=$(select).val();
  if(val==1||val==3){
    return "hostname";
  }else if(val==2||val==4||val==5){
    return "ipaddress";
  }else if(val==6){
    return "email";
  }
}
function clearErrors(){
  closeError();
  $(".gl_error").removeClass("gl_error");
  $(".gl_fielderror").remove();
}
function showError(errorMessage){
	if(errorMessage)$('#errorpop_errmsg').html(errorMessage);
	$('#errorpop').show(1,function(){
		$('#errorpop').center();
		$('#errorpop').hide();
		$('#errorpop').fadeIn("slow");
	});
}
function closeError(){
	$('#errorpop').fadeOut("slow");
}
function showpopup(id,callback){
  $("#newentry_dialog").hide();
  $("#edit_dialog").hide();
  $("#delete_dialog").hide();
  $("#password_dialog").hide();
  if(id==""){
    $("#edit_dialog").data("uid","");
    $("#delete_dialog").data("uid","");
  }else{
    $("#"+id).show(1,function(){
      $("#"+id).center();
      $("#"+id).hide();
      $("#"+id).fadeIn(350);
      setTimeout(function(id){$($("#"+id).children().find("input")[0]).focus();},0,id);
    });
  }
  if(typeof callback === "function") callback();
}
function resetforms(){
  $("#newentry_dialog input").val("");
  $("#newentry_dialog checkbox").prop("checked",false);
  $("#delete_dialog_label_container div").remove();
  showpopup("");
}
function login(pwd,callback){
  if(pwd){
    setCookie("pwd",btoa(pwd));
  }
  edit({
    typekey:"checkpwd"
  },function(res,err){
    pwdcorrect=(res.code==1);
    if(typeof callback==="function") callback(res.code==1);
  });
}
function logout(){
  setCookie("pwd","")
  login();
  resetforms();
}
function twodigit(n){
  if(n.toString().length<2){
    return("0"+n.toString())
  }else{
    return(n.toString())
  }
}
function UtcToString(Utc){
  var d = new Date(parseInt(Utc)*1000);
  if(SHOWALLDATEINFO){
    return(d.toString());
  }else{
    if(language=="english"){
      return(twodigit(d.getMonth()+1)+"."+twodigit(d.getDate())+"."+d.getFullYear()+" "+
      twodigit(((d.getHours()>12)?(d.getHours()-12):d.getHours()))
      +":"+twodigit(d.getMinutes())
      +((d.getHours()>12)?" PM":"AM"));
    }else{
      return(twodigit(d.getDate())+"."+twodigit(d.getMonth()+1)+"."+d.getFullYear()+" "+twodigit(d.getHours())+":"+twodigit(d.getMinutes()));
    }
  }
}
function getList(callback){
  $.ajax({
    url: "/list",
    type: "POST",
    dataType: "json",
    data: {
      "password":getPassword(),
    },
    success: function(response){
      console.log(response);
      if(response.successful){
        global_list={};
        for(let k in response.result){
          global_list[response.result[k].uid]=response.result[k];
        }
      }else{
        console.error(response.message);
      }
      if(typeof callback==="function") callback(global_list);
    },
    error: function(error) {
      console.log(error);
    }
  });
}
function updateTable(usli,cb){
  var table = document.getElementById("table");
  while(table.firstChild){
    table.removeChild(table.firstChild);
  }
  var tr = document.createElement("div");
  $(tr).addClass("tr");
  for(let b in usli[Object.keys(usli)[0]]){
    if(b!="uid"){
      var th = document.createElement("div");
      $(th).addClass("th cell cell_"+b);
      var label = document.createElement("div");
      label.className = "table-th-label locale_"+b;
      label.id = "table_th_label_"+b;
      if(b=="gesperrt"){
        var div = document.createElement("div");
        $(div).addClass("glyphicon glyphicon-ban-circle gesperrt");
        label.appendChild(div);
      }
      th.appendChild(label);
      var div = document.createElement("div");
      div.className = "table_th_arrow glyphicon glyphicon-chevron-down";
      div.id = "table_th_arrow_"+b;
      $(div).click(function(){
        if(sortby!=$(this).attr('id').split('_')[3]){
          $(".table_th_arrow").removeClass("selected").removeClass("rotated");
          $(this).addClass("selected");
          sortby=$(this).attr('id').split('_')[3];
          revsort = false;
        }else{
          if($(this).hasClass("rotated")){
            $(this).removeClass("rotated");
            revsort = false;
          }else{
            $(this).addClass("rotated");
            revsort = true;
          }
        }
        // console.log("sortby:",sortby, "revsort:",revsort, "selected:",$(this).hasClass("selected")," rotated:",$(this).hasClass("rotated"));
        updateContent(global_list);
      });
      th.appendChild(div);
      tr.appendChild(th);
    }
  }
  table.appendChild(tr);
  updateContent(usli);
  if(typeof cb==="function"){cb();}

}
function updateContent(usli){
  var list = search(sort(usli),$("#search-box").val());
  var table = document.getElementById("table");
  while(table.children.length > 1){
    table.removeChild(table.lastChild);
  }
  for(let a in list){
    var tr = document.createElement("div");
    $(tr).addClass("tr");
    for(let b in list[a]){
      if(b!="uid"){
        var td = document.createElement("div");
        $(td).addClass("td cell cell_"+b);
        switch(b){
          case "moddate":
            if(UTCDATE){
              $(td).text(list[a][b]);
            }else{
              $(td).text(UtcToString(list[a][b]));
            }
            break;
          case "gesperrt":
            if((list[a][b]==1)||(list[a][b]=="1")){
              var div = document.createElement("div");
              $(div).addClass("glyphicon glyphicon-ban-circle gesperrt");
              td.appendChild(div);
              //$(td).addClass("glyphicon glyphicon-ok-circle");
            }else{
              //$(td).addClass("glyphicon glyphicon-remove-circle");
            }
            break;
          case "typ":
            try{
              $(td).addClass("typ_option_"+list[a][b]);
            }catch(e){
              $(td).text(list[a][b]);
            }
            break;
          default:
            $(td).text(list[a][b]);
        }
        tr.appendChild(td);
      }
    }
    var modify_container = document.createElement("div");
    modify_container.className = "td admin_only";

    var td = document.createElement("div");
    $(td).addClass("td");
    var span = document.createElement("span");
    $(span).addClass("btn  btn-primary btn-sm glyphicon glyphicon-pencil edit");
    $(span).data("uid",list[a].uid);
    td.appendChild(span);
    td.title="edit";
    td.className = "edit_td";
    modify_container.appendChild(td);

    var td = document.createElement("div");
    $(td).addClass("td");
    var span = document.createElement("span");
    $(span).addClass("btn btn-danger btn-sm glyphicon glyphicon-trash remove");
    $(span).data("uid",list[a].uid);
    td.appendChild(span);
    td.title="remove";
    td.className = "remove_td";
    modify_container.appendChild(td);
    tr.appendChild(modify_container);
    table.appendChild(tr);
  }
  $(".edit").click(editButtonClick);
  $(".remove").click(removeButtonClick);
  updateLoc();
  if(pwdcorrect){
    $(".admin_only").show();
    $(".user_only").hide();
  }else{
    $(".admin_only").hide();
    $(".user_only").show();
  }
}
function editButtonClick(){
  $("#typ_edit_dialog").trigger('change');
  $("#edit_dialog").data("uid",$(this).data("uid"));
  var uid = $(this).data("uid");
  $("#rufnummer_edit_dialog").val(global_list[uid].rufnummer).trigger('change');
  $("#name_edit_dialog").val(global_list[uid].name).trigger('change');
  $("#typ_edit_dialog").val(global_list[uid].typ).trigger('change');
  $("#hostname_edit_dialog").val(global_list[uid].hostname).trigger('change');
  $("#ipaddresse_edit_dialog").val(global_list[uid].ipaddresse).trigger('change');
  $("#port_edit_dialog").val(global_list[uid].port).trigger('change');
  $("#durchwahl_edit_dialog").val(global_list[uid].extension).trigger('change');
  $("#pin_edit_dialog").val(global_list[uid].pin).trigger('change');
  $("#gesperrt_edit_dialog").prop('checked', global_list[uid].gesperrt).trigger('change');
  showpopup("edit_dialog");
}
function removeButtonClick(){
  $("#delete_dialog_label_container div").remove();
  var uid = $(this).data("uid");
  $("#delete_dialog").data("uid",uid);
  var div = {
    id: "message_delete_dialog_label",
    class: "delete_dialog_label",
    text: languages[language].delete_message
  };
  jQuery('<div/>', div).appendTo("#delete_dialog_label_container");
  for(let k in global_list[uid]){
    var div = {
      id: k+"_delete_dialog_label",
      class: "delete_dialog_label"
    };
    if(k==="moddate"&&(!UTCDATE)){
      div.text = k+": "+UtcToString(global_list[uid][k]);
    }else if(k!=="uid"){
      div.text = k+": "+global_list[uid][k];
    }
    jQuery('<div/>', div).appendTo("#delete_dialog_label_container");
  }
  showpopup("delete_dialog");
}
function edit(vals, cb){
  console.log(vals);
  vals["password"] = getPassword();
  $.ajax({
    url: "/edit",
    type: "POST",
    dataType: "json",
    data: vals,
    success: function(response){
      getList(updateTable);
      if(cb) cb(response.message,null);
      if((response.message.code!=1)&&(response.message.code!=-1)) $("#log").text(JSON.stringify(response.message));
      if(!response.successful){
        console.log(response.message);
      }
    },
    error: function(error){
      console.error(error);
      $("#log").text(JSON.stringify(error));
      if(cb) cb(null,error);
    }
  });
}
function search(list,str){
  var returnlist = [];
  for(let row of list){
    var matches = true;
    var rowstr = "";
    for(let key in row){
      if((key==="moddate")&&(!UTCDATE)){
        rowstr += UtcToString(row[key])+" ";
      }else{
        rowstr += row[key]+" ";
      }
    }
    for(let i in str.split(" ")){
      var word = str.split(" ")[i];
      if(!(new RegExp(word.replace(/[:.?*+^$[\]\\(){}|-]/g, "\\$&"),"gi").test(rowstr))){
        matches = false;
      }
    }
    if(matches) returnlist[returnlist.length] = row;
  }
  return(returnlist);
}
function sortFunction(x,y){
  //console.log(x[sortby],y[sortby],x[sortby].toString().localeCompare(y[sortby].toString(),'de',{numeric:true}));
  return(x[sortby].toString().localeCompare(y[sortby].toString(),'de'/*,{numeric:true}*/));
}
function sort(usli){
  var sortable=[];
  for(let k in usli){
    sortable[sortable.length]=usli[k];
  }
  if(sortby === ""){
    return(sortable);
  }else{
    var iskey = false;
    for(let k in usli[Object.keys(usli)[0]]){
      if(k === sortby){
        iskey = true;
      }
    }
    if(iskey){
      var soli = sortable.sort(sortFunction);
      if(revsort){
        var revsoli = [];
        for(let i=soli.length-1;i>=0;i--){
          revsoli[revsoli.length] = soli[i];
        }
        return(revsoli);
      }else{
        return(soli);
      }
    }else{
      console.log(sortby+" is not a collumn name!");
      return(usli);
    }
  }
}
function initloc(){
  $("#loc-dropdown-parent").click(function(){
    $("#loc-dropdown-children").fadeToggle(300);
  });

  for(let i in languages){
    var child = document.createElement("div");
    child.id="loc-dropdown-child-"+i;
    child.style="background-image:url(/images/"+i+".svg);";
    child.onclick = function(){
      setLanguage(this.id.split("-")[this.id.split("-").length-1]);
      $("#loc-dropdown-children").fadeOut(300);
    };
    document.getElementById("loc-dropdown-children").appendChild(child);
  }
}
function setLanguage(l){
  if(languages[l]){
    language=l;
    setCookie("language",l,365*10);
    $("#loc-dropdown-parent").css("background-image","url(/images/"+l+".svg)");
    updateContent(global_list);
  }
}
function updateLoc(){
  for(let i in languages[language]){
    for(let property in languages[language][i]){
      switch(property){
        case "html":
        $(i).html(languages[language][i][property]);
        break;
        case "text":
        $(i).text(languages[language][i][property]);
        break;
        default:
        $(i).prop(property,languages[language][i][property]);
      }
    }
  }
  jQuery.extend(jQuery.validator.messages,languages[language].verify);
}
function getPassword(){
  try{
    var password = atob(getCookie("pwd"));
  }catch(e){
    console.error(e);
    setCookie("pwd","");
    var password = "";
  }
  return(password);
}
function setCookie(c_name,value,exdays){
  var exdate = new Date();
  exdate.setDate(exdate.getDate() + exdays);
  var c_value = escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
  document.cookie=c_name + "=" + c_value;
}
function getCookie(c_name){
  var i,x,y,ARRcookies=document.cookie.split(";");
  for(let i=0;i<ARRcookies.length;i++){
    x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
    y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
    x=x.replace(/^\s+|\s+$/g,"");
    if (x==c_name){
      return unescape(y);
    }
  }
  return("");
}
function matchHn(str){
  return(/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/.test(str));
}
function matchIp(str){
  return(/(^\s*((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\s*$)|(^\s*( (([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$)/.test(str));
}
