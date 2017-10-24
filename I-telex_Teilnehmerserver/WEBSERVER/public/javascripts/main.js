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
  }
};
var language = "german";
sortby="";
$(document).ready(function(){
  // jumping label
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
    $("#dialogbox").show();
    $("#passworddialog").show();
    $("#newentrydialog").hide();
    $("#editdialog").hide();
    $("#deletedialog").hide();
    actionkey = "login";
  });
  $("#new").click(function(){
    $("#dialogbox").show();
    $("#newentrydialog").show();
    $("#editdialog").hide();
    $("#deletedialog").hide();
    $("#passworddialog").hide();
    actionkey = "new";
  });
  $("#submitdialog").click(function(){
    switch(actionkey){
      case "login":
        login(atob($("#passwordfield").val()));
        $("#passwordfield").val("");
        $("#passwordfield").trigger('change');
        break;
      case "delete":
        edit({
          typekey:actionkey,
          rufnummer: parseInt($("#rufnummerdeletedialog").html()),
        });
        break;
      case "new":
        var locked = $("#gesperrtnewentrydialog").prop('checked') ? 1 : 0;
        edit({
          typekey:actionkey,
          rufnummer: $("#rufnummernewentrydialog").val(),
          name: $("#namenewentrydialog").val(),
          typ: $("#typnewentrydialog").val(),
          hostname: $("#hostnamenewentrydialog").val(),
          ipaddresse: $("#ipadressenewentrydialog").val(),
          port: $("#portnewentrydialog").val(),
          extention: $("#durchwahlnewentrydialog").val(),
          gesperrt: locked,
          moddate: $("#moddatenewentrydialog").val(),
          pin: $("#pinnewentrydialog").val(),
        });
        break;
      case "edit":
        var locked = $("#gesperrteditdialog").prop('checked') ? 1 : 0;
        edit({
          typekey:actionkey,
          rufnummer: $("#rufnummereditdialog").val(),
          name: $("#nameeditdialog").val(),
          typ: $("#typeditdialog").val(),
          hostname: $("#hostnameeditdialog").val(),
          ipaddresse: $("#ipaddresseeditdialog").val(),
          port: $("#porteditdialog").val(),
          extention: $("#durchwahleditdialog").val(),
          gesperrt: locked,
          moddate: $("#moddateeditdialog").val(),
          pin: $("#pineditdialog").val(),
        });
        break;
    }
    resetforms();
    getlist(updatetable);
  });
  $("#abortdialog").click(function(){
    typekey="";
    resetforms();
    getlist(updatetable);
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
        if(typeof callback==="function") callback();
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
  if(pwdcorrect){
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
  if(list.length != 0){
    var th = document.createElement("th");
    table.lastChild.appendChild(th);
    var th = document.createElement("th");
    table.lastChild.appendChild(th);
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
    $("#dialogbox").show();
    $("#editdialog").show();
    $("#deletedialog").hide();
    $("#newentrydialog").hide();
    $("#passworddialog").hide();
    actionkey = "edit";
    var uid = $(this).parent().data("uid");

    $("#rufnummereditdialog").val(global_list[uid].rufnummer).trigger('change');
    $("#nameeditdialog").val(global_list[uid].name).trigger('change');
    $("#typeditdialog").val(global_list[uid].typ).trigger('change');
    $("#hostnameeditdialog").val(global_list[uid].hostname).trigger('change');
    $("#ipaddresseeditdialog").val(global_list[uid].ipaddresse).trigger('change');
    $("#porteditdialog").val(global_list[uid].port).trigger('change');
    $("#durchwahleditdialog").val(global_list[uid].extention).trigger('change');
    $("#gesperrteditdialog").prop('checked', global_list[uid].gesperrt).trigger('change');
    
  });
  $(".remove").click(function(){
    $("#dialogbox").show();
    $("#deletedialog").show();
    $("#editdialog").hide();
    $("#newentrydialog").hide();
    $("#passworddialog").hide();
    actionkey = "delete";
    var str = "really delete this entry?</br>";
    var uid = $(this).parent().data("uid");
    for(i=0;i<this.parentElement.children.length-2;i++){
      str += "</br>"+this.parentElement.children[i].innerHTML;
    }
    $("#rufnummerdeletedialog").html(this.parentElement.children[0].innerHTML);
    $("#deletedialog").html(str);
  });
  setLanguage(language);
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
    },
    error: function(error) {
      if(cb) cb(response);
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
  $("#newentrydialog input").val("");
  $("#newentrydialog checkbox").prop("checked",false);
  /*
  $("#newentrydialog").html(
    '<input placeholder="rufnummer" id="rufnummernewentrydialog"></input><input placeholder="name" id="namenewentrydialog"></input><input placeholder="typ" id="typnewentrydialog"></input><input placeholder="hostname" id="hostnamenewentrydialog"></input><input placeholder="ipaddresse" id="ipaddressenewentrydialog"></input><input placeholder="port"id="portnewentrydialog"></input><input placeholder="durchwahl" id="durchwahlnewentrydialog"></input><input placeholder="pin" id="pinnewentrydialog"></input><input type="checkbox" id="gesperrtnewentrydialog">gesperrt</input></div>');
  $("#editdialog").html(
    '<input placeholder="rufnummer" id="rufnummereditdialog"></input><input placeholder="name" id="nameeditdialog"></input><input placeholder="typ" id="typeditdialog"></input><input placeholder="hostname" id="hostnameeditdialog"></input><input placeholder="ipaddresse" id="ipaddresseeditdialog"></input><input placeholder="port" id="porteditdialog"></input><input placeholder="durchwahl" id="durchwahleditdialog"></input><input type="checkbox" id="gesperrteditdialog">gesperrt</input></div>');
  $("#deletedialog").html(
    '<p id="pdeletedialog"></p><span id="rufnummerdeletedialog">test</span></div>');*/
  $("#newentrydialog").hide();
  $("#editdialog").hide();
  $("#deletedialog").hide()
  $("#passworddialog").hide();
  $("#dialogbox").hide();
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
