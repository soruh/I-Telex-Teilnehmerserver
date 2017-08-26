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
function updatetable() {
  getlist(function(response){
    var table = document.getElementById("table");
    while(table.firstChild){
      table.removeChild(table.firstChild);
    }
    var tr = document.createElement("tr");
    table.appendChild(tr);
    for(b in response[0]){
      var th = document.createElement("th");
      table.lastChild.appendChild(th);
      table.lastChild.lastChild.innerHTML = b;
    }
    for(a in response){
      var tr = document.createElement("tr");
      table.appendChild(tr);
      for(b in response[a]){
        var td = document.createElement("td");
        table.lastChild.appendChild(td);
        table.lastChild.lastChild.innerHTML = response[a][b];
      }
      var td = document.createElement("td");
      table.lastChild.appendChild(td);
      table.lastChild.lastChild.className = "edit";
      var td = document.createElement("td");
      table.lastChild.appendChild(td);
      table.lastChild.lastChild.className = "remove";
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
        $("#nameeditdialog").val(siblings[1].innerHTML);
        $("#typeditdialog").val(siblings[2].innerHTML);
        $("#hostnameeditdialog").val(siblings[3].innerHTML);
        $("#ipadresseeditdialog").val(siblings[4].innerHTML);
        $("#porteditdialog").val(siblings[5].innerHTML);
        $("#durchwahleditdialog").val(siblings[6].innerHTML);
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
  });
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

$(document).ready(function(){
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
        var locked = $("#gesperrtnewentrydialog").val() ? 1 : 0;
        edit({
          typekey:"new",
          password: $("#passworddialog").val(),
          rufnummer: $("#rufnummernewentrydialog").val(),
          name: $("#namenewentrydialog").val(),
          typ: $("#typnewentrydialog").val(),
          hostname: $("#hostnamenewentrydialog").val(),
          ipadresse: $("#ipadressenewentrydialog").val(),
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
          var locked = $("#gesperrteditdialog").val() ? 1 : 0;
          edit({
            typekey:"edit",
            password: $("#passworddialog").val(),
            rufnummer: $("#rufnummereditdialog").val(),
            name: $("#nameeditdialog").val(),
            typ: $("#typeditdialog").val(),
            hostname: $("#hostnameeditdialog").val(),
            ipadresse: $("#ipadresseeditdialog").val(),
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
    updatetable();
  });
  $("#abortdialog").click(function(){
    $("#dialogbox").hide();
    resetforms();
    updatetable();
  });
  updatetable();
});
function resetforms(){
  $("#newentrydialog input").val("");
  $("#newentrydialog checkbox").prop("checked",false);
  /*
  $("#newentrydialog").html(
    '<input placeholder="rufnummer" id="rufnummernewentrydialog"></input><input placeholder="name" id="namenewentrydialog"></input><input placeholder="typ" id="typnewentrydialog"></input><input placeholder="hostname" id="hostnamenewentrydialog"></input><input placeholder="ipadresse" id="ipadressenewentrydialog"></input><input placeholder="port"id="portnewentrydialog"></input><input placeholder="durchwahl" id="durchwahlnewentrydialog"></input><input placeholder="pin" id="pinnewentrydialog"></input><input type="checkbox" id="gesperrtnewentrydialog">gesperrt</input></div>');
  $("#editdialog").html(
    '<input placeholder="rufnummer" id="rufnummereditdialog"></input><input placeholder="name" id="nameeditdialog"></input><input placeholder="typ" id="typeditdialog"></input><input placeholder="hostname" id="hostnameeditdialog"></input><input placeholder="ipadresse" id="ipadresseeditdialog"></input><input placeholder="port" id="porteditdialog"></input><input placeholder="durchwahl" id="durchwahleditdialog"></input><input type="checkbox" id="gesperrteditdialog">gesperrt</input></div>');
  $("#deletedialog").html(
    '<p id="pdeletedialog"></p><span id="rufnummerdeletedialog">test</span></div>');*/
  $("#newentrydialog").hide();
  $("#editdialog").hide();
  $("#deletedialog").hide();
}
//confirmpassword
