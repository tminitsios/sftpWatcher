# sftpMonitor

sftpMonitor helps you monitor a remote SFTP directory for changes.
A similar package is available (sftp-watcher) but it depends on an ssh version that has 2 known security vulnerabilities. It also didn't seem to work for me and hasn't been updated in 4 years so I decided to write my version.

## Installation

Installation is simple: nothing that you haven't used before.

```bash
npm install sftpmonitor
```

## Configuration

I have used the `sftp-watcher` package as inspiration so I decided to keep the same configuration options to make the transition as easy as possible.

The configuration object that you pass to the function has the following properties and defaults:

```javascript
{
  host: "localhost",
  username: "root",
  password: "root",
  privateKey: false,
  path: "/",
  port: 22,
  heartbeat: 1000,
  debugMode: false,
};
```

Some notes:

- _**You can pass an object that contains all of the above properties, none of them, or anything in-between. The defaults will be used for the missing ones.**_

- I haven't tested the privateKey option but it "should" work. Currently, it only supports specifying a file path for the private key (it gets pulled with `fs`) but if there is enough interest, I might add the functionality to support a string or a buffer.

- The `heartbeat` option is the amount of time in milliseconds between each check for changes (I borrowed it from the `sftp-watcher` package but also made it configurable).

- The `debugMode` option will print several messages about the state of the watcher and the sFTP connection. It's mostly what I thought would be a good idea to have for the future but I'm not convinced that it's _super useful_ (at least right now).

## Usage

The return value of the `sftpMonitor()` is both an Event Emitter and a promise. This means that you can use it in 2 ways (generally speaking):

1.  Using the `then()` syntax for Promises:

    ```javascript
    const sftpMonitor = require("sftpmonitor");
    sftpMonitor(config).then((event) => {
      // do something
    });
    ```

2.  Or using the `await` syntax for async/await:
    ```javascript
    const sftpMonitor = require("sftpmonitor");
    async function main() {
      const event = await sftpMonitor(config);
      // do something
    }
    ```

3 events are emitted by the watcher:

- `update`: emitted when a change on a file is detected
- `delete`: emitted when a file is deleted
- `create`: emitted when a file is created

and 1 event is being listened to:

- `stop`: stops the watcher and closes the sFTP connection

## Sample code

### Using the `then()` syntax for Promises

```javascript
const sftpMonitor = require("sftpmonitor");

sftpMonitor(config).then((event) => {
  // Listening for create events
  event.on("create", (file) => {
    console.log(`File: ${file} was created`);
  });

  // Listening for delete events
  event.on("delete", (file) => {
    console.log(`File: ${file} was deleted`);
  });

  // Listening for update events
  event.on("update", (file) => {
    console.log(`File: ${file} was updated`);
  });

  // Some logic goes here...

  // Stop the watcher when you're done
  event.emit("stop");
});
```

### Using the `await` syntax for async/await

```javascript
const sftpMonitor = require("sftpmonitor");

async function main() {
  const event = await sftpMonitor(config);
  // Listening for create events
  event.on("create", (file) => {
    console.log(`File: ${file} was created`);
  });

  // Listening for delete events
  event.on("delete", (file) => {
    console.log(`File: ${file} was deleted`);
  });

  // Listening for update events
  event.on("update", (file) => {
    console.log(`File: ${file} was updated`);
  });

  // Some logic goes here...

  // Stop the watcher when you're done
  event.emit("stop");
}

main();
```

## Misc

1. The `update` event is emitted _**only when a file is updated**_ (not when a file is created or deleted). Even though, technically, the `create` and `delete` events are also `update` events, this was a conscious choice based on the use-cases that I could think of: including `creates` and `deletes` on the update would force people to perform additional logic to figure out what kind of event it was (like comparing the updated entries with the created entries or checking if the file exists in the sFTP directory).

2. I tried to keep the first version as clean as possible based on the use case that I'm working on right now. This means that I removed _some_ of the functionality of the original `sftp-watcher` package (even though the code is a complete rewrite) since it didn't seem very useful to me. However, if people have any suggestions for improvements and new functionality, please don't hesitate to open an issue or pull request.

3. From an implementation standpoint there is a significant difference between the `sftp-watcher` package and this one: the `sftp-watcher` package uses the file size to detect changes in files, while this package is using the last modified date of the file (`mtime`). I do not know if this is supported on all sFTP servers, but if someone faces an issue with this, I might add the file size check as a fallback (you just need to let me know through an issue or pull request).

4. This package uses the `ssh2` library to connect to the sFTP server since it allows for a lot of flexibility in the data that you are getting back. That being said, it is also kind of a nightmare to work with its callbacks. You can use it in order to do more work with the remote files (based on the events that this package has emitted) or you can use a more 'programmer friendly' package like the `ssh2-sftp-client` package. The first option will keep your dependencies to a minimum and the second one will give you a more flexible and fun to use API.
