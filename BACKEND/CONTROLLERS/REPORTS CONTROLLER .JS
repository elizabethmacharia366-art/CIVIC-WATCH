const db=require ('..config/db');
exports.getReports=async(req,res)=>{
    try{
        const[row]=await db.query('SELECT*FROM reports ORDER BY created at DESC');
        res.json (row);}
        catch(err){        res.status(500).json({error:err.message});
}
};
exports.createReport=async(req,res)=>{
    const {title,description,user_id}=req.body;
    try{
        await db.query(
            'INSERY INTO reports(title, description,use_id)VALUES(?,?,?)',
            [title,description,user_id]
        );
            res.status(201).json({sucess:true,message:'report submitted'});
    }
            catch(err){
                res.status(500).json({error:err.message});

            }
};