constjwt =required ('jsonwebtoken');
const JWT_SECRET=process.env. JWT_SECRET||'supersecretkey';
const JWT_EXPIRES_IN='1h';
function generatetoken (playload)
{
return jwt.sign(playload,JWT_SECRET,{expiresIn:JWT_EXPIRES_IN});

}
function verifytoken(token){
    try{
return jwt.verify(token,JWT_SECRET)
    }
    catch(err){
        return null;
    }
}
Module.exports={
    generatetoken,
verifytoken,
JWT_SECRET,
JWT_EXPIRES_IN
};
