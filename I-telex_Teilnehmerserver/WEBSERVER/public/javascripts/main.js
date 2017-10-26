/*1: peer able to support the “texting baudot” protocol, accessible by a host name (known by official DNS servers)
2: peer able to support the “texting baudot” protocol, accessible by a given IP address (IPv4)
3: peer only supporting “ascii texting” (or a standard telnet client), accessible by a host name (known by official DNS servers)
4: peer only supporting “ascii texting” (or a standard telnet client), accessible by a given IP address (IPv4)
5: same as 2, but IP address may change frequently
6: not a real peer, but an “official” email address.*/
var UTCDATE = false;
var SHOWALLDATEINFO = false;
const SHOWTYPENUMBER = true;
var pwdcorrect = false;
var global_list={};
const type_list = {
  1:"I-Telex<br>hostname",
  2:"I-Telex<br>static Ip",
  3:"ASCII<br>hostname",
  4:"ASCII<br>static Ip",
  5:"I-Telex<br>dynamic Ip",
  6:"E-mail",
  7:"ASCII<br>dynamic Ip",
}
const languages = {
  german:{
    "#table-th-label-rufnummer":"telex-nummer",
    "#table-th-label-name":"name",
    "#table-th-label-typ":"typ",
    "#table-th-label-hostname":"hostname",
    "#table-th-label-ipaddresse":"ipaddresse",
    "#table-th-label-port":"port",
    "#table-th-label-extention":"durchwahl",
    "#table-th-label-gesperrt":"gesperrt",
    "#table-th-label-moddate":"letzte Änderung",
    "#search-box":"suchen|placeholder",
    "#new":"neuer eintrag",
    ".edit":"bearbeiten|title",
    ".remove":"entfernen|title",
    "#login":"einloggen",
    "#logout":"ausloggen",
    "#abortdialog":"abbrechen",
    "#submitdialog":"absenden",
    "#wrongpwd":"Falsches Passwort!",
    ".typ_option_1":"Hostname Baudot (1)",
    ".typ_option_2":"Ip Baudot (2)",
    ".typ_option_3":"Hostname Ascii (3)",
    ".typ_option_4":"Ip Ascii (4)",
    ".typ_option_5":"DynIp Baudot (5)",
    ".typ_option_6":"“offizielle” E-mail (6)",
    "#passwordfield_label":"passwort",
    "#rufnummer_newentry_dialog_label":"rufnummer",
    "#name_newentry_dialog_label":"name",
    "#typ_newentry_dialog_label":"typ",
    "#hostname_newentry_dialog_label":"hostname",
    "#ipaddresse_newentry_dialog_label":"ipaddresse",
    "#port_newentry_dialog_label":"port",
    "#durchwahl_newentry_dialog_label":"durchwahl",
    "#gesperrt_newentry_dialog_label":"gesperrt",
    "#rufnummer_edit_dialog_label":"rufnummer",
    "#name_edit_dialog_label":"name",
    "#typ_edit_dialog_label":"typ",
    "#hostname_edit_dialog_label":"hostname",
    "#ipaddresse_edit_dialog_label":"ipaddresse",
    "#port_edit_dialog_label":"port",
    "#durchwahl_edit_dialog_label":"durchwahl",
    "#gesperrt_edit_dialog_label":"gesperrt",
  },
  english:{
    "#table-th-label-rufnummer":"telex-number",
    "#table-th-label-name":"name",
    "#table-th-label-typ":"type",
    "#table-th-label-hostname":"hostname",
    "#table-th-label-ipaddresse":"ipaddress",
    "#table-th-label-port":"port",
    "#table-th-label-extention":"extention",
    "#table-th-label-gesperrt":"locked",
    "#table-th-label-moddate":"last changed",
    "#search-box":"search|placeholder",
    "#new":"new entry",
    ".edit":"edit|title",
    ".remove":"remove|title",
    "#login":"log in",
    "#logout":"log out",
    "#abortdialog":"abort",
    "#submitdialog":"submit",
    "#wrongpwd":"Wrong password!",
    ".typ_option_1":"hostname baudot (1)",
    ".typ_option_2":"ip baudot (2)",
    ".typ_option_3":"hostname ascii (3)",
    ".typ_option_4":"ip ascii (4)",
    ".typ_option_5":"DynIp baudot (5)",
    ".typ_option_6":"“official” e-mail (6)",
    "#passwordfield_label":"password",
    "#rufnummer_newentry_dialog_label":"telex-number",
    "#name_newentry_dialog_label":"name",
    "#typ_newentry_dialog_label":"type",
    "#hostname_newentry_dialog_label":"hostname",
    "#ipaddresse_newentry_dialog_label":"ipaddress",
    "#port_newentry_dialog_label":"port",
    "#durchwahl_newentry_dialog_label":"extention",
    "#gesperrt_newentry_dialog_label":"locked",
    "#rufnummer_edit_dialog_label":"telex-number",
    "#name_edit_dialog_label":"name",
    "#typ_edit_dialog_label":"type",
    "#hostname_edit_dialog_label":"hostname",
    "#ipaddresse_edit_dialog_label":"ipaddress",
    "#port_edit_dialog_label":"port",
    "#durchwahl_edit_dialog_label":"extention",
    "#gesperrt_edit_dialog_label":"locked",
  }
};
var language = "german";
var sortby="";
var revsort=false;
$(document).ready(function(){
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
  login(null,function(){
    initloc();
  });
  jQuery("input,select,textarea").bind("checkval",function(){
    if(jQuery(this).val() !== ""){
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
    search(sort(global_list),$("#search-box").val(),function(list){
      updateTable(list);
    });
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
  /*
  $("#search-button").click(function(){
    jQuery(this).trigger("checkval");
    search($("#search-box").val(),(list)=>{
      updateTable(list);
    });
  });
  $("#search-box").change(function(){
    jQuery(this).trigger("checkval");
    search($("#search-box").val(),(list)=>{
      updateTable(list);
    });
  });*/
  $("#login").click(function(){
    $("#dialog_box").show();
    $("#password_dialog").show();
    $("#passwordfield").focus();
    $("#newentry_dialog").hide();
    $("#edit_dialog").hide();
    $("#delete_dialog").hide();
    actionkey = "login";
  });
  $("#new").click(function(){
    $("#dialog_box").show();
    $("#newentry_dialog").show();
    $("#edit_dialog").hide();
    $("#delete_dialog").hide();
    $("#password_dialog").hide();
    actionkey = "new";
  });
  $("#submitdialog").click(function(){
    switch(actionkey){
      case "login":
        login(atob($("#passwordfield").val()),function(successful){
          if(!successful){
            $("#wrongpwd").show().fadeOut(3000);
          }
        });
        $("#passwordfield").val("");
        $("#passwordfield").trigger('change');
        break;
      case "delete":
        edit({
          typekey:actionkey,
          rufnummer: parseInt($("#rufnummer_delete_dialog").html()),
        });
        break;
      case "new":
        var gesperrt = $("#gesperrt_newentry_dialog").prop('checked') ? 1 : 0;
        edit({
          typekey:actionkey,
          rufnummer: $("#rufnummer_newentry_dialog").val(),
          name: $("#name_newentry_dialog").val(),
          typ: $("#typ_newentry_dialog").val(),
          hostname: $("#hostname_newentry_dialog").val(),
          ipaddresse: $("#ipaddresse_newentry_dialog").val(),
          port: $("#port_newentry_dialog").val(),
          extention: $("#durchwahl_newentry_dialog").val(),
          gesperrt: gesperrt,
          moddate: $("#moddate_newentry_dialog").val(),
          pin: $("#pin_newentry_dialog").val(),
        });
        break;
      case "edit":
        var gesperrt = $("#gesperrt_edit_dialog").prop('checked') ? 1 : 0;
        edit({
          typekey:actionkey,
          rufnummer: $("#rufnummer_edit_dialog").val(),
          name: $("#name_edit_dialog").val(),
          typ: $("#typ_edit_dialog").val(),
          hostname: $("#hostname_edit_dialog").val(),
          ipaddresse: $("#ipaddresse_edit_dialog").val(),
          port: $("#port_edit_dialog").val(),
          extention: $("#durchwahl_edit_dialog").val(),
          gesperrt: gesperrt,
          moddate: $("#moddate_edit_dialog").val(),
          pin: $("#pin_edit_dialog").val(),
        });
        break;
    }
    resetforms();
    getList(updateTable);
  });
  $("#abortdialog").click(function(){
    typekey="";
    resetforms();
  });
});

function login(pwd,callback){
  if(pwd){
    setCookie("pwd",pwd);
  }
  edit({
    typekey:"checkpwd"
  },function(result){
    pwdcorrect=(result.code==1);
    getList(function(li){
      updateTable(li,function(){
        if(typeof callback==="function") callback(result.code==1);
      });
    });
  });
}
function logout(){
  setCookie("pwd","")
  login();
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
    return(twodigit(d.getDate())+"."+twodigit(d.getMonth()+1)+"."+twodigit(d.getFullYear())+" "+twodigit(d.getHours())+":"+twodigit(d.getMinutes()));
  }
}
function getList(callback){
  console.log("getList");
  $.ajax({
    url: "/list",
    type: "POST",
    dataType: "json",
    data: {
      "password":btoa(getCookie("pwd")),
    },
    success: function(response){
      global_list={};
      for(k in response){
        global_list[response[k].uid]=response[k];
      }
      if(typeof callback==="function") callback(global_list);
    },
    error: function(error) {
      console.error(error);
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
  for(b in usli[Object.keys(usli)[0]]){
    if(b!="uid"){
      var th = document.createElement("div");
      $(th).addClass("th cell cell-"+b);
      var div = document.createElement("div");
      div.className = "table-th-label";
      div.id = "table-th-label-"+b;
      th.appendChild(div);

      var div = document.createElement("div");
      div.className = "table-th-arrow glyphicon glyphicon-chevron-down";
      div.id = "table-th-arrow-"+b;
      $(div).click(function(){
        console.log(sortby+"!="+$(this).attr('id').split('-')[3]);
        if(sortby!=$(this).attr('id').split('-')[3]){
          $(".table-th-arrow").removeClass("selected").removeClass("rotated");
          $(this).addClass("selected");
          sortby=$(this).attr('id').split('-')[3];
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
        console.log("sortby:",sortby, "revsort:",revsort, "selected:",$(this).hasClass("selected")," rotated:",$(this).hasClass("rotated"));
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
  var list = sort(usli);
  var table = document.getElementById("table");
  while(table.children.length > 1){
    table.removeChild(table.lastChild);
  }
  for(a in list){
    var tr = document.createElement("div");
    $(tr).addClass("tr");
    for(b in list[a]){
      if(b!="uid"){
        var td = document.createElement("div");
        $(td).addClass("td cell cell-"+b);
        if(b==="moddate"&&(!UTCDATE)){
          $(td).text(UtcToString(list[a][b]));
        }else if(b==="gesperrt"){
          if((list[a][b]==1)||(list[a][b]=="1")){
            $(td).addClass("glyphicon glyphicon-ban-circle");
            //$(td).addClass("glyphicon glyphicon-ok-circle");
          }else{
            //$(td).addClass("glyphicon glyphicon-remove-circle");
          }
        }else if(b==="typ"){
          try{
            $(td).html(type_list[list[a][b]]+(SHOWTYPENUMBER?"("+list[a][b]+")":""));
          }catch(e){
            $(td).text(list[a][b]);
          }
        }else{
          $(td).text(list[a][b]);
        }
        tr.appendChild(td);
      }
    }
    var modify_container = document.createElement("div");
    modify_container.className = "td admin_only";

    var td = document.createElement("div");
    $(td).addClass("td");
    td.innerHTML='<span class="btn  btn-primary btn-sm glyphicon glyphicon-pencil edit"></span>';
    td.title="edit";
    td.className = "edit_td";
    $(td).data("uid",list[a].uid);
    modify_container.appendChild(td);

    var td = document.createElement("div");
    $(td).addClass("td");
    td.innerHTML='<span class="glyphicon glyphicon-trash btn  btn-primary btn-sm remove"></span>';
    td.title="remove";
    td.className = "remove_td";
    $(td).data("uid",list[a].uid);
    modify_container.appendChild(td);
    tr.appendChild(modify_container);
    table.appendChild(tr);
  }
  $(".edit").click(function(){
    $("#dialog_box").show();
    $("#edit_dialog").show();
    $("#delete_dialog").hide();
    $("#newentry_dialog").hide();
    $("#password_dialog").hide();
    actionkey = "edit";

    var uid = $(this).parent().data("uid");
    $("#rufnummer_edit_dialog").val(global_list[uid].rufnummer).trigger('change');
    $("#name_edit_dialog").val(global_list[uid].name).trigger('change');
    $("#typ_edit_dialog").val(global_list[uid].typ).trigger('change');
    $("#hostname_edit_dialog").val(global_list[uid].hostname).trigger('change');
    $("#ipaddresse_edit_dialog").val(global_list[uid].ipaddresse).trigger('change');
    $("#port_edit_dialog").val(global_list[uid].port).trigger('change');
    $("#durchwahl_edit_dialog").val(global_list[uid].extention).trigger('change');
    $("#gesperrt_edit_dialog").prop('checked', global_list[uid].gesperrt).trigger('change');

  });
  $(".remove").click(function(){
    $("#dialog_box").show();
    $("#delete_dialog").show();
    $("#edit_dialog").hide();
    $("#newentry_dialog").hide();
    $("#password_dialog").hide();
    actionkey = "delete";

    var uid = $(this).parent().data("uid");
    var str = "really delete this entry?</br>";
    for(k in global_list[uid]){
      if(k==="moddate"&&(!UTCDATE)){
        str += "</br>"+k+": "+UtcToString(global_list[uid][k]);
      }else{
        str += "</br>"+k+": "+global_list[uid][k];
      }
    }
    $("#rufnummer_delete_dialog").html(global_list[uid].rufnummer);
    $("#message_delete_dialog").html(str);
  });
  setLanguage(language);
  if(pwdcorrect){
    $(".admin_only").show();
    $(".user_only").hide();
  }else{
    $(".admin_only").hide();
    $(".user_only").show();
  }
}
function edit(vals, cb){
  vals["password"] = btoa(getCookie("pwd"));
  $.ajax({
    url: "/edit",
    type: "POST",
    dataType: "json",
    data: vals,
    success: function(response) {
      if(cb) cb(response);
      $("#log").html(JSON.stringify(response));
      getList(updateTable);
    },
    error: function(error) {
      if(cb) cb(error);
      $("#log").html(JSON.stringify(error));
    }
  });
}
function search(list,str,callback){
  var returnlist = [];
  for(row of list){
    var matches = true;
    var rowstr = "";
    for(key in row){
      if((key==="moddate")&&(!UTCDATE)){
        rowstr += UtcToString(row[key])+" ";
      }else{
        rowstr += row[key]+" ";
      }
    }
    for(i in str.split(" ")){
      var word = str.split(" ")[i];
      if(!(new RegExp(word.replace(/[:.?*+^$[\]\\(){}|-]/g, "\\$&"),"gi").test(rowstr))){
        matches = false;
      }
    }
    if(matches) returnlist[returnlist.length] = row;
  }
  callback(returnlist);
}
function resetforms(){
  $("#newentry_dialog input").val("");
  $("#newentry_dialog checkbox").prop("checked",false);
  /*
  $("#newentry_dialog").html(
    '<input placeholder="rufnummer" id="rufnummer_newentry_dialog"></input><input placeholder="name" id="name_newentry_dialog"></input><input placeholder="typ" id="typ_newentry_dialog"></input><input placeholder="hostname" id="hostname_newentry_dialog"></input><input placeholder="ipaddresse" id="ipaddresse_newentry_dialog"></input><input placeholder="port"id="port_newentry_dialog"></input><input placeholder="durchwahl" id="durchwahl_newentry_dialog"></input><input placeholder="pin" id="pin_newentry_dialog"></input><input type="checkbox" id="gesperrt_newentry_dialog">gesperrt</input></div>');
  $("#edit_dialog").html(
    '<input placeholder="rufnummer" id="rufnummer_edit_dialog"></input><input placeholder="name" id="name_edit_dialog"></input><input placeholder="typ" id="typ_edit_dialog"></input><input placeholder="hostname" id="hostname_edit_dialog"></input><input placeholder="ipaddresse" id="ipaddresse_edit_dialog"></input><input placeholder="port" id="port_edit_dialog"></input><input placeholder="durchwahl" id="durchwahl_edit_dialog"></input><input type="checkbox" id="gesperrt_edit_dialog">gesperrt</input></div>');
  $("#delete_dialog").html(
    '<p id="p_delete_dialog"></p><span id="rufnummer_delete_dialog">test</span></div>');*/
  $("#newentry_dialog").hide();
  $("#edit_dialog").hide();
  $("#delete_dialog").hide()
  $("#password_dialog").hide();
  $("#dialog_box").hide();
}
function sortFunction(){
  (x,y)=>{return(x[sortby].toString().localeCompare(y[sortby].toString()),'de',{numeric:true});}
}
function sort(usli){
  var sortable=[];
  for(k in usli){
    sortable[sortable.length]=usli[k];
  }
  if(sortby === ""){
    return(sortable);
  }else{
    var iskey = false;
    for(k in usli[Object.keys(usli)[0]]){
      if(k === sortby){
        iskey = true;
      }
    }
    if(iskey){
      var soli = sortable.sort(sortFunction);
      if(revsort){
        var revsoli = [];
        for(i=soli.length-1;i>=0;i--){
          revsoli[revsoli.length] = soli[i]
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
function setLanguage(l){
  if(languages[l]){
    language=l;
    for(i in languages[l]){
      if(languages[l][i].split("|").length>1){
        $(i).prop(languages[l][i].split("|")[1],languages[l][i].split("|")[0]);
      }else{
        $(i).html(languages[l][i]);
      }
    }
    document.getElementById("loc-dropdown-parent").style = "background-image:url(/images/"+l+".svg);";
  }
}
function initloc(){
  $("#loc-dropdown-parent").click(function(){
    $("#loc-dropdown-children").fadeToggle(300);
  });

  for(i in languages){
    var child=document.createElement("div");
    child.id="loc-dropdown-child-"+i;
    child.style="background-image:url(/images/"+i+".svg);";
    child.onclick = function(){
      setLanguage(this.id.split("-")[this.id.split("-").length-1]);
      $("#loc-dropdown-children").fadeOut(300);
    };
    document.getElementById("loc-dropdown-children").appendChild(child);
  }
}
function setCookie(c_name,value,exdays){
  var exdate = new Date();
  exdate.setDate(exdate.getDate() + exdays);
  var c_value = escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
  document.cookie=c_name + "=" + c_value;
}

function getCookie(c_name){
  var i,x,y,ARRcookies=document.cookie.split(";");
  for (i=0;i<ARRcookies.length;i++){
    x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
    y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
    x=x.replace(/^\s+|\s+$/g,"");
    if (x==c_name){
      return unescape(y);
    }
  }
  return("");
}
