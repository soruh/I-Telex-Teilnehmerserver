/*1: peer able to support the “texting baudot” protocol, accessible by a host name (known by official DNS servers)
2: peer able to support the “texting baudot” protocol, accessible by a given IP address (IPv4)
3: peer only supporting “ascii texting” (or a standard telnet client), accessible by a host name (known by official DNS servers)
4: peer only supporting “ascii texting” (or a standard telnet client), accessible by a given IP address (IPv4)
5: same as 2, but IP address may change frequently
6: not a real peer, but an “official” email address.*/
var hrDate = true;
var showAllDateInfo = false;
var pwdcorrect = false;
var global_list={};
const languages = {
  german:{
    "#table-th-rufnummer":"telex-nummer",
    "#table-th-name":"name",
    "#table-th-typ":"typ",
    "#table-th-hostname":"hostname",
    "#table-th-ipaddresse":"ipaddresse",
    "#table-th-port":"port",
    "#table-th-extention":"durchwahl",
    "#table-th-gesperrt":"gesperrt",
    "#table-th-moddate":"letzte Änderung",
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
    "#table-th-rufnummer":"telex-number",
    "#table-th-name":"name",
    "#table-th-typ":"type",
    "#table-th-hostname":"hostname",
    "#table-th-ipaddresse":"ipaddress",
    "#table-th-port":"port",
    "#table-th-extention":"extention",
    "#table-th-gesperrt":"locked",
    "#table-th-moddate":"last changed",
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
    "#rufnummer_newentry_dialog_label":"number",
    "#name_newentry_dialog_label":"name",
    "#typ_newentry_dialog_label":"type",
    "#hostname_newentry_dialog_label":"hostname",
    "#ipaddresse_newentry_dialog_label":"ipaddress",
    "#port_newentry_dialog_label":"port",
    "#durchwahl_newentry_dialog_label":"extention",
    "#gesperrt_newentry_dialog_label":"locked",
    "#rufnummer_edit_dialog_label":"rufnummer",
    "#name_edit_dialog_label":"name",
    "#typ_edit_dialog_label":"typ",
    "#hostname_edit_dialog_label":"hostname",
    "#ipaddresse_edit_dialog_label":"ipaddress",
    "#port_edit_dialog_label":"port",
    "#durchwahl_edit_dialog_label":"extention",
    "#gesperrt_edit_dialog_label":"locked",
  }
};
var language = "german";
sortby="";
$(document).ready(function(){
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
  jQuery("#search-button, #search-box").bind("search",function(){
    search(global_list,$("#search-box").val(),function(list){
      updatetable(list);
    });
  });
  $("#search-box").on("change",function(){
    jQuery(this).trigger("search");
  }).on("keyup",function(){
    jQuery(this).trigger("search");
  }).on("focus",function(){
    getlist();
  })
  $("#search-button").on("click",function(){
    $("#search-box").fadeToggle();
  });
  /*
  $("#search-button").click(function(){
    jQuery(this).trigger("checkval");
    search($("#search-box").val(),(list)=>{
      updatetable(list);
    });
  });
  $("#search-box").change(function(){
    jQuery(this).trigger("checkval");
    search($("#search-box").val(),(list)=>{
      updatetable(list);
    });
  });*/
  $("#login").click(function(){
    $("#dialog_box").show();
    $("#password_dialog").show();
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
    getlist(updatetable);
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
    if(result.code==1){
      pwdcorrect = true;
      $("#login").hide();
      $("#logout").show();
      $("#new").show();
      $(".remove_td").show();
      $(".edit_td").show();
    }else{
      pwdcorrect = false;
      $("#login").show();
      $("#logout").hide();
      $("#new").hide();
      $(".remove_td").hide();
      $(".edit_td").hide();
    }
    getlist(function(li){
      updatetable(li,function(){
        if(typeof callback==="function") callback(result.code==1);
      });
    });
  });
}
function logout(){
  setCookie("pwd","")
  login();
}
function UtcToString(Utc){
  var d = new Date(parseInt(Utc)*1000);
  if(showAllDateInfo){
    return(d.toString());
  }else{
    return(d.getDate()+"."+(d.getMonth()+1)+"."+d.getFullYear()+" "+d.getSeconds()+":"+d.getMinutes()+":"+d.getHours());
  }
}
function getlist(callback) {
  $.ajax({
    url: "/list",
    type: "POST",
    dataType: "json",
    data: {
      "password":btoa(getCookie("pwd")),
    },
    success: function(response){
      for(k in response){
        global_list[response[k].uid]=response[k];
      }
      if(typeof callback==="function") callback(response);
    },
    error: function(error) {
      console.error(error);
    }
  });
}
function updatetable(usli,cb){
  var list = sort(usli);
  var table = document.getElementById("table");
  while(table.firstChild){
    table.removeChild(table.firstChild);
  }
  var tr = document.createElement("tr");
  table.appendChild(tr);
  for(b in list[0]){
    if(b!="uid"){
      var th = document.createElement("th");
      th.id = "table-th-"+b;
      table.lastChild.appendChild(th);
      $("#table-th-"+b).click(function(){
        sortby=this.id.split('-')[2];
        getlist((li)=>{
          updatetable(li,()=>{
            setLanguage(language);
          });
        });
      });
    }
  }

  for(a in list){
    var tr = document.createElement("tr");
    for(b in list[a]){
      if(b!="uid"){
        var td = document.createElement("td");
        if(b==="moddate"&&hrDate){
          $(td).text(UtcToString(list[a][b]));
        }else{
          $(td).text(list[a][b]);
        }
        tr.appendChild(td);
      }
    }
    var td = document.createElement("td");
    td.innerHTML='<span class="btn  btn-primary btn-sm glyphicon glyphicon-pencil edit"></span>';
    td.title="edit";
    td.className = "edit_td";
    $(td).data("uid",list[a].uid);
    tr.appendChild(td);

    var td = document.createElement("td");
    td.innerHTML='<span class="glyphicon glyphicon-trash btn  btn-primary btn-sm remove"></span>';
    td.title="remove";
    td.className = "remove_td";
    $(td).data("uid",list[a].uid);
    tr.appendChild(td);

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
      if(k==="moddate"&&hrDate){
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
    if(list.length != 0){
      var th = document.createElement("th");
      table.firstChild.appendChild(th);
      var th = document.createElement("th");
      table.firstChild.appendChild(th);
    }
    $("#new").show();
    $(".remove_td").show();
    $(".edit_td").show();
    $("#login").hide();
    $("#logout").show();
  }else{
    $("#new").hide();
    $(".remove_td").hide();
    $(".edit_td").hide();
    $("#login").show();
    $("#logout").hide();
  }
  if(typeof cb==="function"){cb();}

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
      getlist(updatetable);
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
      if((key==="moddate")&&hrDate){
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
function sort(usli){
  if(sortby === ""){
    return(usli);
  }else{
    var iskey = false;
    for(k in usli[0]){
      if(k === sortby){
        iskey = true;
      }
    }
    if(iskey){
      return(usli.sort((x,y)=>{return(comp=x[sortby].toString().localeCompare(y[sortby].toString()));}));
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
