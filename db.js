const util = require('util');
const Database = require('sqlite-async');

const DB_FILE = 'repos.db';

const handleError = err => console.log(err);

const getFileExtension = (path) =>  path.substring(path.lastIndexOf(".") + 1);

const connect = async (path) => {
    try {
	return await Database.open(path || DB_FILE,
				   Database.OPEN_READWRITE | Database.OPEN_CREATE);
    }
    catch(e) {
	console.error(`FIXME: handle sqlite error ${err.message}`);
    }
}

const createTables = async (db) => {
	await db.run(`CREATE TABLE IF NOT EXISTS repo (
            id INTEGER PRIMARY KEY,
            path TEXT UNIQUE)`);
	await db.run(`CREATE TABLE IF NOT EXISTS gcommit (
            repo_id INTEGER,
            commit_hash TEXT,
            author_email TEXT,
            t_epoch INTEGER,
            t_year INTEGER,
            t_month INTEGER,
            t_weekday INTEGER,
            t_day INTEGER,
            t_hour INTEGER,
            t_min INTEGER,
            t_sec INTEGER,
            comment TEXT,
            PRIMARY KEY (repo_id, commit_hash))`);
	await db.run(`CREATE TABLE IF NOT EXISTS file (
            id INTEGER PRIMARY KEY,
            path TEXT,
            ext TEXT)`);
	await db.run(`CREATE TABLE IF NOT EXISTS file_change (
            commit_hash TEXT,
            filename TEXT,
            filetype TEXT,
            file_ext TEXT,
            num_lines_added INTEGER,
            num_lines_deleted INTEGER)`);
}

const addRepo = async (db, path) => {
    await db.run('INSERT INTO repo (path) VALUES (?) ON CONFLICT DO NOTHING', [path]);
    return await db.get('SELECT id id FROM repo WHERE path = ?', [path]);
}

const getLastCommit = async (db, repo) => {
    const results = await db.get(`SELECT MAX(id), commit_hash from gcommit, repo
                   WHERE gcommit.repo_id = (SELECT id FROM repo WHERE path = ?)`, [repo]);
    return results.commit_hash;
}

const addCommit = async (db, repoId, commit, getFileType) => {
    const d = new Date(commit.tstamp);
    try {
    await db.run(
	`INSERT INTO
            gcommit(repo_id,
                   commit_hash,
                   author_email,
                   t_epoch,
                   t_year,
                   t_month,
                   t_weekday,
                   t_day,
                   t_hour,
                   t_min,
                   t_sec,
                   comment)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	[repoId, commit.hash, commit.email, commit.tstamp, d.getFullYear(),
	 d.getMonth(), d.getDay(), d.getDate(), d.getHours(),
	 d.getMinutes(), d.getSeconds(), commit.comment]);
    }
    catch(e) {
	console.error('Error adding commit:', e);
	return;
    }
    return Promise.all(Object.keys(commit.changes).map(
	async filename => (await db.run(
	    `INSERT INTO file_change(
                                  commit_hash,
                                  filename,
                                  filetype,
                                  file_ext,
                                  num_lines_added,
                                  num_lines_deleted)
                    VALUES(?, ?, ?, ?, ?, ?)`,
	    [commit.hash, filename, getFileType(filename), getFileExtension(filename),
	     commit.changes[filename].added,
	     commit.changes[filename].deleted]))));
}

module.exports = { connect, createTables, addRepo, addCommit, getLastCommit };
