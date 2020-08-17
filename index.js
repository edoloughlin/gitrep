const resolve = require('path').resolve
const db = require('./db');
const git = require('./git');

// TODO: nice command line args handling
const args = process.argv.slice(2);
const repoPath = args[0];
const repoBranch = args[1];
const dbPath = args[2];

if(!repoPath || !repoBranch) {
    console.error('Usage:')
    console.error('node index.js repo-path repo-branch [db-path]');
    process.exit(1);
}

const handleError = err => console.log(err);

const getFileType = (filepath) => {
    return 'todo';
}

const main = async () => {
    try {
	let numCommits = 0;
	const repoFullPath = resolve(repoPath);
	const database = await db.connect(dbPath);
	await db.createTables(database);
	const repoId = await db.addRepo(database, repoFullPath);
	const lastCommit = await db.getLastCommit(database, repoId)
	await git.processCommits(repoFullPath, repoBranch, lastCommit,
			     async (commit) => {
				 await db.addCommit(database, repoId, commit, getFileType);
				 if(!(numCommits++ % 100)) {
				     console.log(`${(new Date()).toLocaleString()} - ${numCommits} commits`);
				 }
			     });

    }
    catch(e) {
	console.error(e);
    }
}

main();
