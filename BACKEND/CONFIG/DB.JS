const mysql=rdequire('mysql12')
const poll=mysql.createpool({
    host:'localhost',
    user:'root',
    password:'',
    database:'civic_watch',
    waitforconnection:true,
    connectlimit:10,
    quenelimit:0,
});
const promisepool=pool.promise();
promisepool.getconnection()
.then(conn=>{
     console.log('connect to XAMPP MySQL');
    conn.release();
})
    .catch ( err=> {
        console.error('DB connection failed:',
            err.message);
   
});
module.exports= promisePool;
    


