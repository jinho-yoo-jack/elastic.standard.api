/*
* IB-Class-SearchEngine
* @extends elasticsearch.js
* */
const elasticsearch = require('./elasticsearch.js');
class searchEngine extends elasticsearch{
    /*
    * Constructor
    * @param mode : Engine Type 선택 (SE or RE)
    * */
    constructor(mode) {
        super(mode);
    }
}

module.exports = searchEngine;
