const db=require ('..config/db');
exports.getSystemStats=async(req,res)=>{
    try{
        const[users]=await db.query('SELECT COUNT(*)AS total FROM users');
        const [reports]=await db.query('SELECT COUNT(*)AS total FROM reports');
        res,json({
            users:users[0].total,
            report:reports[0].total,
        });
}
catch (err){
    res.status(500).json({error:err.message});
}
};