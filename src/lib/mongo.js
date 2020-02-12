import { Db, Server as MongoServer } from "mongodb";
import * as async from "async";
import * as config from "./config";

var localhost = '127.0.0.1';  // 从本地主机访问 mongo

const getDb = (...args) => {
  let host = args[0], done = args[1]

  if (args.length === 1) {
    if (typeof args[0] === 'function') {
      done = args[0], host = localhost;
    } else {
      throw new Error('getDb illegal invocation. User either getDb(\'options\', (err, db) => { ... }) OR getDb((err, db) => { ... })');
    }
  }

  let mongoOptions = {};
  host = host || localhost;

  if (config.mongoSSLEnabled)
    mongoOptions = {
      ssl: config.mongoSSLEnabled,
      sslAllowInvalidCertificates: config.mongoSSLAllowInvalidCertificates,
      sslAllowInvalidHostnames: config.mongoSSLAllowInvalidHostnames
    }

  let mongoDb = new Db(config.database, new MongoServer(host, config.mongoPort, mongoOptions));

  mongoDb.open((err, db) => {
    if (err)
      return done(err);

    if (config.username) {
      mongoDb.authenticate(config.username, config.password, (err, result) => {
        return err ? done(err) : done(null, db);
      });
    } else {
      return done(null, db);
    };
  });

};

const replSetGetConfig = (db, done) => {
  db.admin().command(
    { replSetGetConfig: 1 },
    {},
    (err, results) => { err ? done(err) : done(null, results.config) }
  );
};

const replSetGetStatus = (db, done) => {
  db.admin().command(
    { replSetGetStatus: {} },
    {},
    (err, results) => { err ? done(err) : done(null, results); }
  );
};

const initReplSet = (db, hostIpAndPort, done) => {
  console.log('initReplSet', hostIpAndPort);

  db.admin().command({ replSetInitiate: {} }, {}, (err) => {
    if (err) {
      return done(err);
    }


    replSetGetConfig(db, (err, rsConfig) => {
      if (err)
        return done(err);

      console.log('initial rsConfig is', rsConfig);
      rsConfig.configsvr = config.isConfigRS;
      rsConfig.members[0].host = hostIpAndPort;
      async.retry(
        { times: 20, interval: 500 },
        callback => { replSetReconfig(db, rsConfig, false, callback) },
        (err, results) => { err ? done(err) : done(); }
      );
    });
  });
};

const replSetReconfig = (db, rsConfig, force, done) => {
  console.log('replSetReconfig', rsConfig);

  rsConfig.version++;

  db.admin().command(
    { replSetReconfig: rsConfig, force: force },
    {},
    err => { err ? done(err) : done() }
  );
};

const addNewReplSetMembers = (db, addrToAdd, addrToRemove, shouldForce, done) => {
  replSetGetConfig(db, (err, rsConfig) => {
    if (err)
      return done(err);

    removeDeadMembers(rsConfig, addrToRemove);
    addNewMembers(rsConfig, addrToAdd);
    replSetReconfig(db, rsConfig, shouldForce, done);
  });
};

const addNewMembers = (rsConfig, addrsToAdd) => {
  if (!addrsToAdd || !addrsToAdd.length) return;

  let memberIds = [];
  let newMemberId = 0;

  // 构建当前 member IDs 数组
  for (let i in rsConfig.members)
    memberIds.push(rsConfig.members[i]._id);

  for (let i in addrsToAdd) {
    let addrToAdd = addrsToAdd[i];

    // 迭代下一个可用 member ID (最大 255)
    for (let i = newMemberId; i <= 255; i++) {
      if (!memberIds.includes(i)) {
        newMemberId = i;
        memberIds.push(newMemberId);
        break;
      }
    }

    // 再做一个循环，以确保没有添加重复元素
    let exists = false;
    for (let j in rsConfig.members) {
      let member = rsConfig.members[j];
      if (member.host === addrToAdd) {
        console.log("Host [%s] already exists in the Replicaset. Not adding...", addrToAdd);
        exists = true;
        break;
      }
    }

    if (exists)
      continue;

    let cfg = {
      _id: newMemberId,
      host: addrToAdd
    };

    rsConfig.members.push(cfg);
  }
};

const removeDeadMembers = (rsConfig, addrsToRemove) => {
  if (!addrsToRemove || !addrsToRemove.length) return;

  for (let i in addrsToRemove) {

    let addrToRemove = addrsToRemove[i];

    for (let j in rsConfig.members) {
      let member = rsConfig.members[j];
      if (member.host === addrToRemove) {
        rsConfig.members.splice(j, 1);
        break;
      }
    }

  }

};

const isInReplSet = (ip, done) => {
  getDb(ip, (err, db) => {
    if (err)
      return done(err);

    replSetGetConfig(
      db,
      (err, rsConfig) => {
        db.close();
        done(null, (!err && rsConfig) ? true : false)
      }
    );
  });
};


export {
  getDb,
  replSetGetStatus,
  initReplSet,
  addNewReplSetMembers,
  isInReplSet
};