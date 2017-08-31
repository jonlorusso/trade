#! /usr/bin/env node

/*
 * trade
 * https://github.com/jonlorusso/trade
 *
 * Copyright (c) 2017 Jon Lorusso
 * Licensed under the MIT license.
 */

const _ = require('lodash');
const Util = require('util');
const Promise = require('bluebird');
const Bittrex = Promise.promisifyAll(require('node.bittrex.api'));
const Moment = require('moment');
const Columnify = require('columnify')

const commandLineArgs = require('command-line-args');
const commandLineCommands = require('command-line-commands');

const validCommands = [ null, 'help', 'buy', 'sell', 'cancel', 'list' ];
const { command, argv } = commandLineCommands(validCommands)

const optionDefinitions = [
  { name: 'apikey', alias: 'k', type: String },
  { name: 'apisecret', alias: 't', type: String },
  { name: 'market', alias: 'm', type: String },
  { name: 'rate', alias: 'r', type: Number },
  { name: 'quantity', alias: 'q', type: Number },
  { name: 'uuid', alias: 'u', type: String }
];

if (!command || command == 'help') {
    const getUsage = require('command-line-usage')
    const sections = [
      {
        header: 'Trade',
        content: 'Trade on Bittrex via the command line.'
      },
      {
        header: 'Synopsis',
        content: [
          '$ trade [bold]{buy} [bold]{--quantity} 1 [bold]{--rate} 10 [bold]{--market} \'BTC-LTC\' ...',
          '$ trade [bold]{sell} [bold]{--quantity} 1 [bold]{--rate} 10 [bold]{--market} \'BTC-ETH\' ...',
          '$ trade [bold]{cancel} [bold]{--uuid} \'ec810bf0-76ae-4ce7-8b2f-5576bf38d3e2\' ...',
          '$ trade [bold]{list} ...',
          '$ trade help'
        ]
      },
      {
        header: 'Commands',
        content: [
          { name: 'help', summary: 'Display help information.' },
          { name: 'buy', summary: 'Create a new limit buy order.' },
          { name: 'sell', summary: 'Create a new limit sell order.' },
          { name: 'cancel', summary: 'Cancel an existing order.' },
          { name: 'list', summary: 'List open orders.' },
        ]
      },
      {
        header: 'Other parameters',
        content: [
          { name: '--apikey', summary: 'Bittrex API key, must be specified. Alternatively use [bold]{BITTREX_APIKEY} environemnt variable' },
          { name: '--apisecret', summary: 'Bittrex API secret, must be specified. Alternatively use [bold]{BITTREX_APISECRET} environemnt variable' },
        ]
      }
    ];

    console.log(getUsage(sections));
    process.exit();
}

const options = commandLineArgs(optionDefinitions)

var apikey = process.env.BITTREX_APIKEY || options.apikey;
var apisecret = process.env.BITTREX_APISECRET || options.apisecret;

if ( !apikey || !apisecret ) {
  console.error('Error: bittrex --apikey and --apisecret must be specified. Alternatively, use environment variables: BITTREX_APIKEY BITTREX_APISECRET');
  process.exit(1);
}

Bittrex.options({
     apikey :  apikey,
     apisecret : apisecret,
     cleartext : false,
     inverse_callback_arguments : true,
 });

if (command == 'buy' || command == 'sell') {
  var method = Util.format('%slimitAsync', command);

  Bittrex[method]( { market : options.market, rate : options.rate, quantity : options.quantity } )
    .then( function(response) {
      if ( response.success) {
        console.log("Order created, uuid: %s", response.result.uuid);
      }
    })
    .catch(function(error) {
      console.error('Error: %s', error.message);
      process.exit(1);
    });
}

if (command == 'cancel') {
  Bittrex.cancelAsync( { uuid : options.uuid } )
    .then( function(response) {
      if ( response.success) {
        console.log("Order %s cancelled.", options.uuid);
      }
    });
}

if ( command == 'list' ) {
  Bittrex.getopenordersAsync({})
    .then(function(response) {
      // TODO - Show Conditional order params: IsConditional: false, Condition: 'NONE', ConditionTarget: null
      // TODO - Show Additional Fields: CommissionPaid: 0, PricePerUnit: null, Closed: null, CancelInitiated: false, ImmediateOrCancel: false, Price: 0
      var data = _.map(response.result, function(result) {
        var opened = Moment(result.Opened);
        return { 
          'Order Date' : opened.format('YYYY-DD-MM HH:MM:SS'),
          'Order ID' : result.OrderUuid,
          'Exchange' : result.Exchange,
          'Order Type' : result.OrderType,
          'Quantity' : result.QuantityRemaining,
          'Price' : result.Limit 
        };
      });
      console.log(Columnify(data, { columns: [ "Order Date", "Order ID", "Exchange", "Order Type", "Quantity", "Price" ] } ));
    });
}
