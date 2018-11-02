const sqlite = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, '/db/telefonbuch.db');

function connectToDb() {
    return new Promise((resolve, reject) => {
        let db = new sqlite.Database(dbPath, (sqlite.OPEN_CREATE|sqlite.OPEN_READWRITE), err => {
            if (err) {
                reject(err);
                return;
			}
			console.log('opened database.');
            resolve(db);
        });
    });
}

fs.mkdirSync(path.dirname(dbPath), {recursive: true});

connectToDb()
.then((db) => {
	db.exec(fs.readFileSync('./tables.sql').toString(), (err)=>{
		if(err) {
			console.error(err);
			process.exit(1);
		}
		console.log('created tables.');
	});
})
.catch((err) => {
	console.error(err);
});