/*1: peer able to support the “texting baudot” protocol, accessible by a host name (known by official DNS servers)
2: peer able to support the “texting baudot” protocol, accessible by a given IP address (IPv4)
3: peer only supporting “ascii texting” (or a standard telnet client), accessible by a host name (known by official DNS servers)
4: peer only supporting “ascii texting” (or a standard telnet client), accessible by a given IP address (IPv4)
5: same as 2, but IP address may change frequently
6: not a real peer, but an “official” email address.*/
var UTCDATE = false;
var SHOWALLDATEINFO = false;
var DEFAULTLANGUAGE = "german";
var pwdcorrect = false;
var global_list={};

const languages = {
  german:{
    "#table-th-label-rufnummer":{text:"telex-nummer"},
    "#table-th-label-name":{text:"name"},
    "#table-th-label-typ":{text:"typ"},
    "#table-th-label-hostname":{text:"hostname"},
    "#table-th-label-ipaddresse":{text:"ipaddresse"},
    "#table-th-label-port":{text:"port"},
    "#table-th-label-extension":{text:"durchwahl"},
    "#table-th-label-gesperrt":{title:"gesperrt"},
    "#table-th-label-moddate":{text:"letzte Änderung"},
    "#search-box":{placeholder:"suchen"},
    "#new":{text:"neuer eintrag"},
    ".edit":{title:"bearbeiten"},
    ".remove":{title:"entfernen"},
    "#login":{text:"einloggen"},
    "#logout":{text:"ausloggen"},
    ".abort_dialog":{text:"abbrechen"},
    ".submit_dialog":{text:"absenden"},
    "#wrongpwd":{text:"Falsches Passwort!"},
    ".typ_option_1":{text:"Hostname Baudot (1)"},
    ".typ_option_2":{text:"Ip Baudot (2)"},
    ".typ_option_3":{text:"Hostname Ascii (3)"},
    ".typ_option_4":{text:"Ip Ascii (4)"},
    ".typ_option_5":{text:"DynIp Baudot (5)"},
    ".typ_option_6":{text:"“offizielle” E-mail (6)"},
    ".typ_option_7":{text:"DynIp Ascii (7)"},
    "#passwordfield_label":{text:"passwort"},
    "#rufnummer_newentry_dialog_label":{text:"rufnummer"},
    "#name_newentry_dialog_label":{text:"name"},
    "#typ_newentry_dialog_label":{text:"typ"},
    "#hostname_newentry_dialog_label":{text:"hostname"},
    "#ipaddresse_newentry_dialog_label":{text:"ipaddresse"},
    "#port_newentry_dialog_label":{text:"port"},
    "#durchwahl_newentry_dialog_label":{text:"durchwahl"},
    "#gesperrt_newentry_dialog_label":{text:"gesperrt"},
    "#rufnummer_edit_dialog_label":{text:"rufnummer"},
    "#name_edit_dialog_label":{text:"name"},
    "#typ_edit_dialog_label":{text:"typ"},
    "#hostname_edit_dialog_label":{text:"hostname"},
    "#ipaddresse_edit_dialog_label":{text:"ipaddresse"},
    "#port_edit_dialog_label":{text:"port"},
    "#durchwahl_edit_dialog_label":{text:"durchwahl"},
    "#gesperrt_edit_dialog_label":{text:"gesperrt"},
  },
  english:{
    "#table-th-label-rufnummer":{text:"telex-number"},
    "#table-th-label-name":{text:"name"},
    "#table-th-label-typ":{text:"type"},
    "#table-th-label-hostname":{text:"hostname"},
    "#table-th-label-ipaddresse":{text:"ipaddress"},
    "#table-th-label-port":{text:"port"},
    "#table-th-label-extension":{text:"extension"},
    "#table-th-label-gesperrt":{title:"locked"},
    "#table-th-label-moddate":{text:"last changed"},
    "#search-box":{placeholder:"search"},
    "#new":{text:"new entry"},
    ".edit":{title:"edit"},
    ".remove":{title:"remove"},
    "#login":{text:"log in"},
    "#logout":{text:"log out"},
    ".abort_dialog":{text:"abort"},
    ".submit_dialog":{text:"submit"},
    "#wrongpwd":{text:"Wrong password!"},
    ".typ_option_1":{text:"hostname baudot (1)"},
    ".typ_option_2":{text:"ip baudot (2)"},
    ".typ_option_3":{text:"hostname ascii (3)"},
    ".typ_option_4":{text:"ip ascii (4)"},
    ".typ_option_5":{text:"DynIp baudot (5)"},
    ".typ_option_6":{text:"“official” e-mail (6)"},
    ".typ_option_7":{text:"DynIp Ascii (7)"},
    "#passwordfield_label":{text:"password"},
    "#rufnummer_newentry_dialog_label":{text:"telex-number"},
    "#name_newentry_dialog_label":{text:"name"},
    "#typ_newentry_dialog_label":{text:"type"},
    "#hostname_newentry_dialog_label":{text:"hostname"},
    "#ipaddresse_newentry_dialog_label":{text:"ipaddress"},
    "#port_newentry_dialog_label":{text:"port"},
    "#durchwahl_newentry_dialog_label":{text:"extension"},
    "#gesperrt_newentry_dialog_label":{text:"locked"},
    "#rufnummer_edit_dialog_label":{text:"telex-number"},
    "#name_edit_dialog_label":{text:"name"},
    "#typ_edit_dialog_label":{text:"type"},
    "#hostname_edit_dialog_label":{text:"hostname"},
    "#ipaddresse_edit_dialog_label":{text:"ipaddress"},
    "#port_edit_dialog_label":{text:"port"},
    "#durchwahl_edit_dialog_label":{text:"extension"},
    "#gesperrt_edit_dialog_label":{text:"locked"},
  }
};
var language = DEFAULTLANGUAGE;
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
    showpopup("password_dialog", function(){
      $("#passwordfield").focus();
    })
  });
  $("#new").click(function(){
    showpopup("newentry_dialog");
  });
  $("#submit_password_dialog").click(function(){
    login(atob($("#passwordfield").val()),function(successful){
      if(!successful){
        $("#wrongpwd").show().fadeOut(3000);
      }
    });
    $("#passwordfield").val("");
    $("#passwordfield").trigger('change');
    resetforms();
    getList(updateTable);
  });
  $("#submit_newentry_dialog").click(function(){
    var gesperrt = $("#gesperrt_newentry_dialog").prop('checked') ? 1 : 0;
    edit({
      typekey:"new",
      rufnummer: $("#rufnummer_newentry_dialog").val(),
      name: $("#name_newentry_dialog").val(),
      typ: $("#typ_newentry_dialog").val(),
      hostname: $("#hostname_newentry_dialog").val(),
      ipaddresse: $("#ipaddresse_newentry_dialog").val(),
      port: $("#port_newentry_dialog").val(),
      extension: $("#durchwahl_newentry_dialog").val(),
      gesperrt: gesperrt,
      moddate: $("#moddate_newentry_dialog").val(),
      pin: $("#pin_newentry_dialog").val(),
    });
    resetforms();
    getList(updateTable);
  });
  $("#submit_edit_dialog").click(function(){
    var gesperrt = $("#gesperrt_edit_dialog").prop('checked') ? 1 : 0;
    console.log();
    edit({
      typekey:"edit",
      uid: $("#edit_dialog").data("uid"),
      rufnummer: $("#rufnummer_edit_dialog").val(),
      name: $("#name_edit_dialog").val(),
      typ: $("#typ_edit_dialog").val(),
      hostname: $("#hostname_edit_dialog").val(),
      ipaddresse: $("#ipaddresse_edit_dialog").val(),
      port: $("#port_edit_dialog").val(),
      extension: $("#durchwahl_edit_dialog").val(),
      gesperrt: gesperrt,
      moddate: $("#moddate_edit_dialog").val(),
      pin: $("#pin_edit_dialog").val(),
    });
    resetforms();
    getList(updateTable);
  });
  $("#submit_delete_dialog").click(function(){
    edit({
      typekey:"delete",
      uid:$("#delete_dialog").data("uid"),
    });
    resetforms();
    getList(updateTable);
  });
  $(".abort_dialog").click(function(){
    resetforms();
    getList(updateTable);
  });
});
function showpopup(id,callback){
  $("#edit_dialog").data("uid","");
  $("#delete_dialog").data("uid","");
  $("#newentry_dialog").hide();
  $("#edit_dialog").hide();
  $("#delete_dialog").hide();
  $("#password_dialog").hide();
  if(id!=""){
    $("#"+id).show(1,function(){
      $("#"+id).center();
      $("#"+id).hide();
      $("#"+id).fadeIn(350);
    });
  }
  if(typeof callback === "function") callback();
}
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
      console.log(response);
      if(response.successful){
        global_list={};
        for(k in response.result){
          global_list[response.result[k].uid]=response.result[k];
        }
      }else{
        console.error(response.message);
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
      var label = document.createElement("div");
      label.className = "table-th-label";
      label.id = "table-th-label-"+b;
      if(b=="gesperrt"){
        var div = document.createElement("div");
        $(div).addClass("glyphicon glyphicon-ban-circle gesperrt");
        label.appendChild(div);
      }
      th.appendChild(label);
      var div = document.createElement("div");
      div.className = "table-th-arrow glyphicon glyphicon-chevron-down";
      div.id = "table-th-arrow-"+b;
      $(div).click(function(){
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
        switch(b){
          case "moddate":
            if(!UTCDATE){
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
    $(span).addClass("btn btn-primary btn-sm glyphicon glyphicon-trash remove");
    $(span).data("uid",list[a].uid);
    td.appendChild(span);
    td.title="remove";
    td.className = "remove_td";
    modify_container.appendChild(td);
    tr.appendChild(modify_container);
    table.appendChild(tr);
  }
  $(".edit").click(function(){
    $("#edit_dialog").data("uid",$(this).data("uid"));
    var uid = $(this).data("uid");
    $("#rufnummer_edit_dialog").val(global_list[uid].rufnummer).trigger('change');
    $("#name_edit_dialog").val(global_list[uid].name).trigger('change');
    $("#typ_edit_dialog").val(global_list[uid].typ).trigger('change');
    $("#hostname_edit_dialog").val(global_list[uid].hostname).trigger('change');
    $("#ipaddresse_edit_dialog").val(global_list[uid].ipaddresse).trigger('change');
    $("#port_edit_dialog").val(global_list[uid].port).trigger('change');
    $("#durchwahl_edit_dialog").val(global_list[uid].extension).trigger('change');
    $("#gesperrt_edit_dialog").prop('checked', global_list[uid].gesperrt).trigger('change');
    showpopup("edit_dialog");
  });
  $(".remove").click(function(){
    $("#delete_dialog").data("uid",$(this).data("uid"));
    var uid = $(this).data("uid");
    var str = "really delete this entry?</br>";
    for(k in global_list[uid]){
      if(k==="moddate"&&(!UTCDATE)){
        str += "</br>"+k+": "+UtcToString(global_list[uid][k]);
      }else{
        str += "</br>"+k+": "+global_list[uid][k];
      }
    }
    $("#message_delete_dialog").html(str);
    showpopup("delete_dialog");
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
  console.log(vals);
  $.ajax({
    url: "/edit",
    type: "POST",
    dataType: "json",
    data: vals,
    success: function(response) {
      getList(updateTable)
      if(cb) cb(response.message);
      if((response.message.code!=1)&&(response.message.code!=-1)) $("#log").html(JSON.stringify(response.message));
      if(!response.successful){
        console.error(response.message);
      }
    },
    error: function(error) {
      $("#log").html(JSON.stringify(error));
      if(cb) cb(error);
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
  showpopup("");
}
function sortFunction(x,y){
  //console.log(x[sortby],y[sortby],x[sortby].toString().localeCompare(y[sortby].toString(),'de',{numeric:true}));
  return(x[sortby].toString().localeCompare(y[sortby].toString(),'de',{numeric:true}));
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
      if(!revsort){
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
    for(id in languages[l]){
      for(property in languages[l][id]){
        switch(property){
          case "html":
            $(id).html(languages[l][id][property]);
            break;
          case "text":
            $(id).text(languages[l][id][property]);
            break;
          default:
            $(id).prop(property,languages[l][id][property]);
        }
      }
    }
    $("#loc-dropdown-parent").css("background-image","url(/images/"+l+".svg)");
  }
}
function initloc(){
  $("#loc-dropdown-parent").click(function(){
    $("#loc-dropdown-children").fadeToggle(300);
  });

  for(i in languages){
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
