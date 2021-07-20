const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const knex = require('knex');
const bcrypt = require('bcrypt-nodejs');
const clarifai = require('clarifai');

const db = knex({
    client:'pg',
    connection:{
        connectionString : process.env.DATABASE_URL,
        ssl:true,
    }
});

// postgres://sqyegznnvndzan:a4f58b00f1eea65bf78d8ef0b8f6376618e8e16782168a127c5ea2e24ca47d85@ec2-54-235-192-146.compute-1.amazonaws.com:5432/d1bkj72inmg92r
const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/',(req,res)=>{
    res.send("it is working!");
})
app.post('/signin' , (req,res)=>{
    const {email , password} = req.body;
    if(!email||!password){
        return res.status(400).json('incorrect form submission')
    }
    db('login').select('email','hash').where('email','=',email)
    .then(data =>{
        const isvalid = bcrypt.compareSync(password,data[0].hash);
        if(isvalid)
        {
            db('users').select('*').where('email','=',req.body.email).then(user => {
                res.json(user[0]);
            }).catch(err => res.status(400).json('unable to get user'))
        }
        else{
            res.status(400).json('wrong credentials 1')
        }
    }).catch(err => res.status(400).json('wrong credentials 2 '))
})
app.post('/register', (req,res)=>{
    const {email ,name , password} = req.body; 
    console.log(email,name);
    if(!email||!name||!password){
        return res.status(400).json('incorrect form submission')
    }
    const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
        trx.insert({
            hash:hash,
            email : email
        }).into('login').returning('email').then(Emaillogin => {
             trx('users')
            .returning('*')
            .insert({
                name: name,
                email: Emaillogin[0],
                joined:new Date()
            }).then(user => 
            {res.json(user[0]);
            }).then(trx.commit).catch(trx.rollback) 
            })
    }).catch(err => res.status(400).json('User already exists or we are unable to register'))
})
app.get('/profile/:id', (req,res) =>{
    const { id} = req.params;
    db.select('*').from('users').where({id}).then(user => {
        if(user.length)
        {
            res.json(user[0])
        }
        else{
            res.status(400).json('Not Found')
        }
    })
    })

app.put('/image', (req,res) =>{
    const { id} = req.body;
    db('users').where('id','=',id)
    .increment('entries',1).returning('entries')
    .then(entries=> {
        res.json(entries[0]);
        })
    .catch(err => res.status(400).json('unable to access entries'))
    })


if(process.env.NODE_ENV === "production")
{
    app.use(express.static('client/build'))
}
app.listen(process.env.PORT || 3000, ()=>{
    console.log(`app is running in port ${process.env.PORT}`);
})