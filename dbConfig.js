require('dotenv').config();

const { Pool } = require("pg");
const { isParameterPropertyDeclaration } = require('typescript');

//True if in production otherwise in developement False
const isProduction = process.env.NODE_ENV ==='production';

const connectionString =  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

//If in production use database_url in developement use our connection string
const pool = new Pool({
    connectionString: isProduction ? process.env.DATABASE_URL : connectionString
});

module.exports = { pool };