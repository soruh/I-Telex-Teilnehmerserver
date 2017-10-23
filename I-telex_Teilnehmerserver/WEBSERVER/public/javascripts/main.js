var hrDate = true;
var showAllDateInfo = false;

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
    url: "/stats",
    type: "GET",
    success: function(response) {
      callback(response);
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
  for(a in list){
    var tr = document.createElement("tr");
    table.appendChild(tr);
    for(b in list[a]){
      var td = document.createElement("td");
      table.lastChild.appendChild(td);
      if(b==="moddate"&&hrDate){
        table.lastChild.lastChild.innerHTML = UtcToString(list[a][b]);
      }else{
        table.lastChild.lastChild.innerHTML = list[a][b];
      }
    }
    var td = document.createElement("td");
    td.innerHTML='<span class="btn  btn-primary btn-sm glyphicon glyphicon-pencil edit"></span>';
    td.title="edit";
    td.className = "edit_td";
    table.lastChild.appendChild(td);

    var td = document.createElement("td");
    td.innerHTML='<span class="glyphicon glyphicon-trash btn  btn-primary btn-sm remove"></span>';
    td.title="remove";
    td.className = "remove_td";
    table.lastChild.appendChild(td);


  }
  for(i in document.getElementsByClassName("edit")){
    document.getElementsByClassName("edit")[i].onclick = function(){
      $("#dialogbox").show();
      $("#editdialog").show();
      $("#deletedialog").hide();
      $("#newentrydialog").hide();
      actionkey = "edit";
      var siblings = this.parentElement.children;
      var gesperrt = siblings[7].innerHTML ? true : false;
      $("#rufnummereditdialog").val(siblings[0].innerHTML);
      document.getElementById("rufnummereditdialog").onkeydown();
      $("#nameeditdialog").val(siblings[1].innerHTML);
      document.getElementById("nameeditdialog").onkeydown();
      $("#typeditdialog").val(siblings[2].innerHTML);
      document.getElementById("typeditdialog").onkeydown();
      $("#hostnameeditdialog").val(siblings[3].innerHTML);
      document.getElementById("hostnameeditdialog").onkeydown();
      $("#ipaddresseeditdialog").val(siblings[4].innerHTML);
      document.getElementById("ipaddresseeditdialog").onkeydown();
      $("#porteditdialog").val(siblings[5].innerHTML);
      document.getElementById("porteditdialog").onkeydown();
      $("#durchwahleditdialog").val(siblings[6].innerHTML);
      document.getElementById("durchwahleditdialog").onkeydown();
      $("#gesperrteditdialog").prop('checked', gesperrt);
    };
  }
  for(i in document.getElementsByClassName("remove")){
    document.getElementsByClassName("remove")[i].onclick = function(){
      $("#dialogbox").show();
      $("#deletedialog").show();
      $("#editdialog").hide();
      $("#newentrydialog").hide();
      actionkey = "delete";
      var str = "really delete this entry?</br>";
      for(i=0;i<this.parentElement.children.length-2;i++){
        str += "</br>"+this.parentElement.children[i].innerHTML;
      }
      $("#rufnummerdeletedialog").html(this.parentElement.children[0].innerHTML);
      $("#pdeletedialog").html(str);
    }
  }
  setLanguage(language);
  if(typeof cb==="function"){cb();}
}
function edit(vals){
  console.log(vals);
  $.ajax({
    url: "/edit",
    type: "POST",
    dataType: "json",
    data: vals,
    success: function(response) {
      $("#log").html(JSON.stringify(response));
    },
    error: function(error) {
      $("#log").html(JSON.stringify(error));
    }
  });
}
function search(str,callback){
  var regex = new RegExp("("+str.replace(/ /g,"&")+")","gi");
  getlist((list)=>{
    var returnlist = [];
    for(row of list){
      var showrow = false;
      for(i in row){
        if(i!=="moddate"){
          var val = row[i];
          if(regex.test(val)){
            showrow = true;
          }
        }
      }
      if(showrow){
        returnlist[returnlist.length] = row;
      }
    }
    callback(returnlist);
  });
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
  $("#deletedialog").hide();
}
sortby="";
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
var languages = {
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
    ".remove":"entfernen|title"
  },english:{
    "#table-th-rufnummer":"telex-number",
    "#table-th-name":"name",
    "#table-th-typ":"type",
    "#table-th-hostname":"hostname",
    "#table-th-ipaddresse":"ipaddress",
    "#table-th-port":"port",
    "#table-th-extention":"extention",
    "#table-th-gesperrt":"lcoked",
    "#table-th-moddate":"last changed",
    "#search-box":"search|placeholder",
    "#new":"new entry",
    ".edit":"edit|title",
    ".remove":"remove|title"
  }
};
var language = "german";
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
$(document).ready(()=>{
  getlist((li)=>{
    updatetable(li,()=>{
      initloc();
    })
  });
  $("#search-button").click(()=>{
    search($("#search-box").val(),(list)=>{
      updatetable(list);
    });
  });
  $("#search-box").change(()=>{
    search($("#search-box").val(),(list)=>{
      updatetable(list);
    });
  });
  $("#new").click(function(){
    $("#dialogbox").show();
    $("#newentrydialog").show();
    $("#editdialog").hide();
    $("#deletedialog").hide();
    actionkey = "new";
  });
  $("#submitdialog").click(function(){
    switch(actionkey){
      case "new":
        var locked = $("#gesperrtnewentrydialog").prop('checked') ? 1 : 0;
        edit({
          typekey:"new",
          password: $("#passworddialog").val(),
          rufnummer: $("#rufnummernewentrydialog").val(),
          name: $("#namenewentrydialog").val(),
          typ: $("#typnewentrydialog").val(),
          hostname: $("#hostnamenewentrydialog").val(),
          ipaddresse: $("#ipaddressenewentrydialog").val(),
          port: $("#portnewentrydialog").val(),
          durchwahl: $("#durchwahlnewentrydialog").val(),
          gesperrt: locked,
          moddate: $("#moddatenewentrydialog").val(),
          pin: $("#pinnewentrydialog").val(),
        });
        break;
      case "delete":
        edit({
          typekey:"delete",
          password: $("#passworddialog").val(),
          rufnummer: parseInt($("#rufnummerdeletedialog").html()),
        });
        break;
      case "edit":
        var locked = $("#gesperrteditdialog").prop('checked') ? 1 : 0;
        edit({
          typekey:"edit",
          password: $("#passworddialog").val(),
          rufnummer: $("#rufnummereditdialog").val(),
          name: $("#nameeditdialog").val(),
          typ: $("#typeditdialog").val(),
          hostname: $("#hostnameeditdialog").val(),
          ipaddresse: $("#ipaddresseeditdialog").val(),
          port: $("#porteditdialog").val(),
          durchwahl: $("#durchwahleditdialog").val(),
          gesperrt: locked,
          moddate: $("#moddateeditdialog").val(),
          pin: $("#pineditdialog").val(),
        });
        break;
    }
    $("#dialogbox").hide();
    resetforms();
    getlist(updatetable);
  });
  $("#abortdialog").click(function(){
    $("#dialogbox").hide();
    resetforms();
    getlist(updatetable);
  });
  $.each(document.getElementsByClassName("input"), (index, input)=>{
      var nametag = input.parentNode.children;
      for(i=0;i<nametag.length;i++){
        if(nametag[i].className.split(" ").find((str)=>{return(str === "nametag");})==="nametag"){
          nametag = nametag[i];
        }
      }
      input.placeholder = nametag.innerHTML;
      input.onkeydown=function(){
        setTimeout(()=>{
          if(input.value.length==0){
            nametag.className=nametag.className.replace("shown","hidden");
          }else{
            nametag.className=nametag.className.replace("hidden","shown");
          }
        },1);
      };
  });
});
