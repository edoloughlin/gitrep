// TODO: Switch to nodegit. The documentation is kinda sparse and porcelain commands
// TODO: are not supported.
// It's way easier to spawn the command line

const spawn = require('child_process').spawn;
var StreamSplitter = require("stream-splitter");

const args = process.argv.slice(2);
const repoPath = args[0];
const repoBranch = args[1];

const processCommit = async (commitLines, onCommit) => {
  let unused, hash, tstamp, email, comment;
  [unused, hash, tstamp, email, comment] = commitLines.shift().split('|');
  tstamp = new Date(tstamp).getTime();
  const changes = commitLines.reduce((acc, cur) => {
    let added, deleted, filename;
    [added, deleted, filename] = cur.replace(/([0-9\-]+)\s+([0-9\-]+)\s+(.*)/ig, '$1|$2|$3').split('|');
    // added/deleted can be '-' for binary files
    added = Number.parseInt(added)? added : null;
    deleted = Number.parseInt(deleted)? deleted : null;
    return {...acc, [filename]: {added, deleted}};
  }, {});
  onCommit && await onCommit({hash, tstamp, email, comment, changes});
}

const checkout = async (path, branch) => {
  return new Promise((resolve, reject) => {
    let alreadyOnBranch = false;
    const gitProc = spawn('git', ['checkout', branch], { cwd: path });
    gitProc.on('close', (code) => {
      if(code !== 0 && !alreadyOnBranch) {
        console.log(`git checkout ${branch} exited with code ${code}`);
        reject(code);
      }
      else {
        resolve();
      }
    });
    gitProc.stdout.on('data', data => console.log(`LOG: ${data}`));
    gitProc.stderr.on('data', data => {
      if(data.toString().startsWith('Already on ')) {
        alreadyOnBranch = true;
      }
      else {
        console.error(`ERORR: ${data}`)
      }
    });
  });
}

const log = async (lastCommit, onCommit) => {
  return new Promise((resolve, reject) => {
    let commitLines = [];
    const args = ['log',
                  '--numstat',
                  '--pretty="COMMIT|%H|%ad|%aE|%s"'];
    if(lastCommit) {
      args.push(`${lastCommit}..`);
    }
    const gitProc = spawn('git', args, { cwd: repoPath }).stdout.pipe(StreamSplitter("\n"));
    gitProc.encoding = "utf8";

    gitProc.on('token', async (data) => {
      const lines = data.toString().split(/(\r?\n)/g)
            .map(s => s.replace(/^"(.+?)"$/gi, "$1"))
            .filter(s => s);
      for(let line of lines) {
        if(line.startsWith('COMMIT|')) {
          if(commitLines.length > 0) {
            await processCommit(commitLines, onCommit);
          }
          commitLines = [line];
        }
        else if(line) {
          commitLines.push(line);
        }
      }
    });
    gitProc.on('error', data => console.error(`ERORR: ${data}`));
    gitProc.on('done', async (code) => {
      if(code !== 0) {
        console.log(`git log ${lastCommit} exited with code ${code}`);
        reject(code);
      }
      else {
        if(commitLines.length > 0) {
          await processCommit(commitLines, onCommit);
        }
        resolve();
      }
    });
  });
}

const processCommits = async (repoPath, repoBranch, lastCommit, onCommit) => {
  if(repoPath && repoBranch) {
    console.log('Checking out', repoBranch, 'on', repoPath);
    await checkout(repoPath, repoBranch)
    await log(lastCommit, onCommit);
  }
}

module.exports = { processCommits };
