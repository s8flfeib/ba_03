const LocalStrategy = require("passport-local").Strategy;
const { pool } = require('./dbConfig');
const bcrypt = require('bcrypt');



function initialize(passport){
    const authenticateUser = (name, password, done) => {
        
        //console.log(name)
        //console.log(password)

        pool.query(`SELECT * FROM users WHERE name = $1`, [name], (err,results) => {
                // console.log(results)
                if(err){
                    throw err;
                }
                //console.log(results.rows);

                if(results.rows.length > 0 ){

                    const user = results.rows[0];

                    bcrypt.compare(password, user.password, async (err, ismatch) =>{

                        if(err){
                            throw err;
                        }

                            if(ismatch){
                                return done(null, user)         // null = no error   gibt user zurück 
                            }else{
                                return done(null ,false ,{message: "Passwort ist nicht korrekt!"});
                            }


                    })

                }else {
                    return done(null , false , {message: "Name ist nicht registert!"});
                }
        })
    }
 
 
    passport.use(
        new LocalStrategy(
        {
             usernameField:"name",
             passwordField:"password"
        }, 
        authenticateUser
    ));

   passport.serializeUser((user, done) => done(null, user.id));
   
   passport.deserializeUser((id, done)=>{
       pool.query(
           `SELECT * FROM users WHERE id = $1`, [id], (err, results) => {
               if(err)
               {
                   throw err;
               }
               return done(null, results.rows[0]);
           }
       );
   });
}
   
module.exports = initialize; 