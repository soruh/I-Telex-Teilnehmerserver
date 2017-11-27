var fortune = new XMLHttpRequest();
fortune.onreadystatechange = function(){if(this.readyState == 4) console.log(this.responseText);};
fortune.open("GET", "http://vertretung.skelett.de/fortune", true);
fortune.send();
