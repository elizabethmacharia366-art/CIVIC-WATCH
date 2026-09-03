const db=require ('..config/db');
exports.getNotifications=async(req,res)=>{
    try{
        const[row]=await db.query('SELECT*FROM notifications ORDER BY created at DESC');
        res.json (row);}
        catch(err){        res.status(500).json({error:err.message});
}
    };
exports.createNotification=async(req,res)=>{
try{
    await db.query('INSERT INTO notifications(message, user_id)values(??)',
        [message,user_id]);
        res.status(201).json({success:true,message:'Notification created'});
    }
    catch(err){
        res.status(500).json({error:err.message});

    }
};
