'use strict';
const shim = require('fabric-shim');
const util = require('util');

async function queryByKey(stub, key) {
    console.log('============= START : queryByKey ===========');
    console.log('##### queryByKey key: ' + key);
  
    let resultAsBytes = await stub.getState(key); 
    if (!resultAsBytes || resultAsBytes.toString().length <= 0) {
      throw new Error('##### queryByKey key: ' + key + ' does not exist');
    }
    console.log('##### queryByKey response: ' + resultAsBytes);
    console.log('============= END : queryByKey ===========');
    return resultAsBytes;
  }


  //////////////////

  let Chaincode = class {

    /**
     * Initialize the state when the chaincode is either instantiated or upgraded
     * 
     * @param {*} stub 
     */
    async Init(stub) {
      console.log('=========== Init: Instantiated / Upgraded ngo chaincode ===========');
      return shim.success();
    }
  
    /**
     * The Invoke method will call the methods below based on the method name passed by the calling
     * program.
     * 
     * @param {*} stub 
     */
    async Invoke(stub) {
      console.log('============= START : Invoke ===========');
      let ret = stub.getFunctionAndParameters();
      console.log('##### Invoke args: ' + JSON.stringify(ret));
  
      let method = this[ret.fcn];
      if (!method) {
        console.error('##### Invoke - error: no chaincode function with name: ' + ret.fcn + ' found');
        throw new Error('No chaincode function with name: ' + ret.fcn + ' found');
      }
      try {
        let response = await method(stub, ret.params);
        console.log('##### Invoke response payload: ' + response);
        return shim.success(response);
      } catch (err) {
        console.log('##### Invoke - error: ' + err);
        return shim.error(err);
      }
    }
  
    /**
     * Initialize the state. This should be explicitly called if required.
     * 
     * @param {*} stub 
     * @param {*} args 
     */
    async initLedger(stub, args) {
      console.log('============= START : Initialize Ledger ===========');
      console.log('============= END : Initialize Ledger ===========');
    }
  
    /************************************************************************************************
     * 
     * Donor functions 
     * 
     ************************************************************************************************/
  
     /**
     * Creates a new donor
     * 
     * @param {*} stub 
     * @param {*} args - JSON as follows:
     * {
     *    "donorUserName":"edge",
     *    "email":"edge@abc.com",
     *    "registeredDate":"2018-10-22T11:52:20.182Z"
     * }
     */
    async createDonor1(stub, args) {
      console.log('============= START : createDonor ===========');
      console.log('##### createDonor arguments: ' + JSON.stringify(args));
  
      // args is passed as a JSON string
      let json = JSON.parse(args);
      let key = 'user-' + json['odenId'];
      json['docType'] = 'user';
  
      console.log('##### createDonor payload: ' + JSON.stringify(json));
  
      // Check if the donor already exists
      let donorQuery = await stub.getState(key);
      if (donorQuery.toString()) {
        throw new Error('##### createDonor - This donor already exists: ' + json['donorUserName']);
      }
  
      await stub.putState(key, Buffer.from(JSON.stringify(json)));
      console.log('============= END : createDonor ===========');
    }
  
    /**
     * Retrieves a specfic donor
     * 
     * @param {*} stub 
     * @param {*} args 
     */
    async queryDonor(stub, args) {
      console.log('============= START : queryDonor ===========');
      console.log('##### queryDonor arguments: ' + JSON.stringify(args));
  
      // args is passed as a JSON string
      let json = JSON.parse(args);
      let key = 'user-' + json['odenId'];
      console.log('##### queryDonor key: ' + key);
  
      return queryByKey(stub, key);
    }
  
    /**
     * Retrieves all donors
     * 
     * @param {*} stub 
     * @param {*} args 
     */
    async queryAllDonors(stub, args) {
      console.log('============= START : queryAllDonors ===========');
      console.log('##### queryAllDonors arguments: ' + JSON.stringify(args));
   
      let queryString = '{"selector": {"docType": "user"}}';
      return queryByString(stub, queryString);
    }
  
    async queryHistoryForKey(stub, args) {
      console.log('============= START : queryHistoryForKey ===========');
      console.log('##### queryHistoryForKey arguments: ' + JSON.stringify(args));
  
      // args is passed as a JSON string
      let json = JSON.parse(args);
      let key = json['key'];
      let docType = json['docType']
      console.log('##### queryHistoryForKey key: ' + key);
      let historyIterator = await stub.getHistoryForKey(docType + key);
      console.log('##### queryHistoryForKey historyIterator: ' + util.inspect(historyIterator));
      let history = [];
      while (true) {
        let historyRecord = await historyIterator.next();
        console.log('##### queryHistoryForKey historyRecord: ' + util.inspect(historyRecord));
        if (historyRecord.value && historyRecord.value.value.toString()) {
          let jsonRes = {};
          console.log('##### queryHistoryForKey historyRecord.value.value: ' + historyRecord.value.value.toString('utf8'));
          jsonRes.TxId = historyRecord.value.tx_id;
          jsonRes.Timestamp = historyRecord.value.timestamp;
          jsonRes.IsDelete = historyRecord.value.is_delete.toString();
        try {
            jsonRes.Record = JSON.parse(historyRecord.value.value.toString('utf8'));
          } catch (err) {
            console.log('##### queryHistoryForKey error: ' + err);
            jsonRes.Record = historyRecord.value.value.toString('utf8');
          }
          console.log('##### queryHistoryForKey json: ' + util.inspect(jsonRes));
          history.push(jsonRes);
        }
        if (historyRecord.done) {
          await historyIterator.close();
          console.log('##### queryHistoryForKey all results: ' + JSON.stringify(history));
          console.log('============= END : queryHistoryForKey ===========');
          return Buffer.from(JSON.stringify(history));
        }
      }
    }
  }
  shim.start(new Chaincode());
  