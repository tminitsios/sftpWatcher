const fs = require("fs");
const EventEmitter = require("events");

const Client = require("ssh2").Client;

function sftpWatcher(userConfig) {
  return new Promise((resolve, reject) => {
    const defaultConfig = {
      host: "localhost",
      username: "root",
      password: "root",
      privateKey: false,
      path: "/",
      port: 22,
      heartbeat: 1000,
      debugMode: false,
    };
    const config = Object.assign(defaultConfig, userConfig);
    if (config.debugMode) {
      console.log("Config:", config);
    }
    sftpInit(config)
      .then((result) => {
        const { client, sftp } = result;
        const event = new EventEmitter();
        fileWatcher(client, sftp, event, config);
        resolve(event);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function fileWatcher(client, sftp, event, config) {
  let state = null;

  const interval = setInterval(async function () {
    const dirInfo = await readDir(sftp, config.path);
    if (!state) {
      if (config.debugMode) {
        console.log("Initializing state...");
      }
      // Build the state
      if (dirInfo.length == 0) {
        state = [];
      } else {
        state = dirInfo.map((file) => {
          return { name: file.filename, mtime: file.attrs.mtime };
        });
      }
    } else {
      if (config.debugMode) {
        console.log("Checking for changes...");
      }
      // Compare the state
      const newState = dirInfo.map((file) => {
        return { name: file.filename, mtime: file.attrs.mtime };
      });
      // Updated files
      const updatedDiff = newState.filter((file) => {
        const oldFile = state.find((oldFile) => {
          return oldFile.name == file.name;
        });
        return oldFile ? oldFile.mtime < file.mtime : false;
      });
      // Deleted files
      const deletedDiff = state.filter((file) => {
        return !newState.some((newFile) => {
          return newFile.name == file.name;
        });
      });
      // Created files
      const createdDiff = newState.filter((file) => {
        return !state.some((stateFile) => {
          return stateFile.name == file.name;
        });
      });
      // Emit the events
      updatedDiff.forEach((file) => {
        event.emit("update", file.name);
      });
      deletedDiff.forEach((file) => {
        event.emit("delete", file.name);
      });
      createdDiff.forEach((file) => {
        event.emit("create", file.name);
      });
      state = newState;
    }
  }, config.heartbeat);

  event.on("stop", () => {
    if (config.debugMode) {
      console.log('"stop" event');
      console.log("Stopping the interval...");
      console.log("Closing the connection...");
    }
    clearInterval(interval);
    sftp.end();
    client.end();
    if (config.debugMode) {
      console.log("Connection closed");
    }
  });
}

function readDir(sftp, path) {
  return new Promise((resolve, reject) => {
    sftp.readdir(path, (err, list) => {
      if (err) reject(err);
      resolve(list);
    });
  });
}

function sftpInit(config) {
  return new Promise((resolve, reject) => {
    let privateKey;
    if (config.privateKey) {
      privateKey = fs.readFileSync(config.privateKey);
    }
    const connectionOptions = !config.privateKey
      ? {
          host: config.host,
          username: config.username,
          password: config.password,
          port: config.port,
        }
      : {
          host: config.host,
          username: config.username,
          privateKey,
          port: config.port,
        };

    const client = new Client();
    if (config.debugMode) {
      console.log("Connecting to the server...");
    }
    client.connect(connectionOptions);
    client.on("ready", () => {
      if (config.debugMode) {
        console.log("Client connected...");
      }

      client.sftp((err, sftp) => {
        if (err) reject(err);
        if (config.debugMode) {
          console.log("SFTP connected...");
        }
        resolve({ client, sftp });
      });
    });
  });
}

module.exports = sftpWatcher;
