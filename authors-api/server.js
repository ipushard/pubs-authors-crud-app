// imporing express, this is a framework used to create ourbackend apis
const express = require('express');
//cros allows our angular front to call backend api, without this angular will be bloced by the browser
const cors = require('cors');
//im using the msnodesql18 ebcause we conect using windows authentiication
const sql = require('mssql/msnodesqlv8');


// app is representing our backend server
const app = express();


//enable cros for all requests
app.use(cors());
//allow server to understand json in the body of requests
app.use(express.json());


//admin vars
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

// emailing service
const nodemailer = require('nodemailer');



                                                                                                                               // EMAIL HELPER
                                                                                                                                                                                               // EMAIL HELPER
                                                                // this sends registration invite email using Gmail SMTP and Nodemailer
                                                                async function sendInviteEmail(toEmail, employeeName, inviteLink) {
                                                                    console.log('Preparing invite email...');
                                                                    console.log('SMTP service:', process.env.SMTP_SERVICE);
                                                                    console.log('SMTP user:', process.env.SMTP_USER);
                                                                    console.log('SMTP from:', process.env.SMTP_FROM);
                                                                    console.log('Sending email to:', toEmail);

                                                                    const transporter = nodemailer.createTransport({
                                                                        service: process.env.SMTP_SERVICE,
                                                                        auth: {
                                                                            user: process.env.SMTP_USER,
                                                                            pass: process.env.SMTP_PASS
                                                                        }
                                                                    });

                                                                    const emailResult = await transporter.sendMail({
                                                                        from: process.env.SMTP_FROM,
                                                                        to: toEmail,
                                                                        subject: 'Complete your Pubs Data Management registration',
                                                                        html: `
                                                                            <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5;">
                                                                                <h2>Welcome, ${employeeName}</h2>

                                                                                <p>
                                                                                    An account has been created for you in the Pubs Data Management application.
                                                                                </p>

                                                                                <p>
                                                                                    Click the link below to create your password and complete your registration:
                                                                                </p>

                                                                                <p>
                                                                                    <a href="${inviteLink}" style="font-weight: bold;">
                                                                                        Complete Registration
                                                                                    </a>
                                                                                </p>

                                                                                <p>
                                                                                    If the link does not work, copy and paste this URL into your browser:
                                                                                </p>

                                                                                <p>
                                                                                    ${inviteLink}
                                                                                </p>

                                                                                <p>
                                                                                    This invitation was sent from a local school project demo.
                                                                                </p>
                                                                            </div>
                                                                        `
                                                                    });

                                                                    console.log('Invite email send result:', {
                                                                        messageId: emailResult.messageId,
                                                                        accepted: emailResult.accepted,
                                                                        rejected: emailResult.rejected,
                                                                        pending: emailResult.pending,
                                                                        response: emailResult.response
                                                                    });

                                                                    return {
                                                                        messageId: emailResult.messageId,
                                                                        accepted: emailResult.accepted,
                                                                        rejected: emailResult.rejected,
                                                                        pending: emailResult.pending,
                                                                        response: emailResult.response
                                                                    };
                                                                }












                                                                                                // TEMP ROUTE: test Gmail email sending
                                                app.post('/api/test-email', async (req, res) => {
                                                    try {
                                                        const { email } = req.body;

                                                        if (!email) {
                                                            return res.status(400).json({
                                                                message: 'Email is required.'
                                                            });
                                                        }

                                                        const emailDebug = await sendInviteEmail(
                                                            email,
                                                            'Test Employee',
                                                            'http://localhost:4200/register-invite?token=test-token'
                                                        );

                                                        res.json({
                                                            message: 'Test email sent successfully. Check the inbox.',
                                                            emailDebug: emailDebug
                                                        });
                                                    } catch (err) {
                                                        console.error('Test email error:', err);

                                                        res.status(500).json({
                                                            message: 'Error sending test email.',
                                                            error: err.message
                                                        });
                                                    }
                                                });




// ADMIN CHECK MIDDLEWARE
// this checks the current database value not only the JWT token
// this prevents old tokens from keeping admin access after admin rights are removed
async function requireAdmin(req, res, next) {
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(403).json({
                message: 'Access denied. Admin only.'
            });
        }

        const pool = await sql.connect(dbConfig);

        const adminCheck = await pool.request()
            .input('user_id', sql.Int, req.user.user_id)
            .query(`
                SELECT
                    user_id,
                    emp_id,
                    is_admin,
                    is_active
                FROM app_users
                WHERE user_id = @user_id
            `);

        if (adminCheck.recordset.length === 0) {
            return res.status(403).json({
                message: 'Access denied. User account was not found.'
            });
        }

        const currentUser = adminCheck.recordset[0];

        if (!currentUser.is_active) {
            return res.status(403).json({
                message: 'Access denied. Your account is disabled.'
            });
        }

        if (!currentUser.is_admin) {
            return res.status(403).json({
                message: 'Access denied. Admin only.'
            });
        }

        req.currentUserFromDatabase = currentUser;

        next();

    } catch (err) {
        console.error('Admin check error:', err);

        res.status(500).json({
            message: 'Error checking admin permissions.',
            error: err.message
        });
    }
}







// SALES ACCESS CHECK MIDDLEWARE
// sales page is sensitive
// allowed users: Admin, CEO, CFO, Sales, Business Operations Manager, Marketing Manager
async function requireSalesAccess(req, res, next) {
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(403).json({
                message: 'Access denied. Sales access only.'
            });
        }

        const pool = await sql.connect(dbConfig);

        const userCheck = await pool.request()
            .input('user_id', sql.Int, req.user.user_id)
            .query(`
                SELECT
                    au.user_id,
                    au.emp_id,
                    au.is_admin,
                    au.is_active,

                    e.fname,
                    e.lname,

                    j.job_desc
                FROM app_users au
                LEFT JOIN employee e ON au.emp_id = e.emp_id
                LEFT JOIN jobs j ON e.job_id = j.job_id
                WHERE au.user_id = @user_id
            `);

        if (userCheck.recordset.length === 0) {
            return res.status(403).json({
                message: 'Access denied. User account was not found.'
            });
        }

        const currentUser = userCheck.recordset[0];

        if (!currentUser.is_active) {
            return res.status(403).json({
                message: 'Access denied. Your account is disabled.'
            });
        }

        if (currentUser.is_admin) {
            req.currentUserFromDatabase = currentUser;
            return next();
        }

        const jobDescription = currentUser.job_desc ? currentUser.job_desc.trim().toLowerCase() : '';

        const allowedSalesRoles = [
            'chief executive officer',
            'chief financial officer',
            'sales representative',
            'sales',
            'business operations manager',
            'marketing manager'
        ];

        if (!allowedSalesRoles.includes(jobDescription)) {
            return res.status(403).json({
                message: 'Access denied. Sales page is only available to CEO, CFO, Sales, Business Operations Manager, Marketing Manager, or System Administrator.'
            });
        }

        req.currentUserFromDatabase = currentUser;

        next();

    } catch (err) {
        console.error('Sales access check error:', err);

        res.status(500).json({
            message: 'Error checking sales access permissions.',
            error: err.message
        });
    }
}












                                                                                // ADMIN CREATE EMPLOYEE AND SEND REGISTRATION INVITE
                                                                                app.post('/api/admin/employees/invite', authenticateToken, requireAdmin, async (req, res) => {
                                                                                    try {
                                                                                        const {
                                                                                            emp_id,
                                                                                            fname,
                                                                                            minit,
                                                                                            lname,
                                                                                            email,
                                                                                            job_id,
                                                                                            job_lvl,
                                                                                            pub_id
                                                                                        } = req.body;

                                                                                        if (!emp_id || !fname || !lname || !email || !job_id || !job_lvl || !pub_id) {
                                                                                            return res.status(400).json({
                                                                                                message: 'Employee ID, first name, last name, email, job, job level, and publisher are required.'
                                                                                            });
                                                                                        }

                                                                                        const pool = await sql.connect(dbConfig);

                                                                                        // check if employee ID already exists
                                                                                        const employeeCheck = await pool.request()
                                                                                            .input('emp_id', sql.Char(9), emp_id)
                                                                                            .query(`
                                                                                                SELECT emp_id
                                                                                                FROM employee
                                                                                                WHERE emp_id = @emp_id
                                                                                            `);

                                                                                        if (employeeCheck.recordset.length > 0) {
                                                                                            return res.status(409).json({
                                                                                                message: 'Employee ID already exists.'
                                                                                            });
                                                                                        }

                                                                                        // check if email already exists
                                                                                        const userCheck = await pool.request()
                                                                                            .input('email', sql.VarChar(255), email)
                                                                                            .query(`
                                                                                                SELECT email
                                                                                                FROM app_users
                                                                                                WHERE email = @email
                                                                                            `);

                                                                                        if (userCheck.recordset.length > 0) {
                                                                                            return res.status(409).json({
                                                                                                message: 'Email already has an account.'
                                                                                            });
                                                                                        }

                                                                                        // check selected job and job level
                                                                                        const jobCheck = await pool.request()
                                                                                            .input('job_id', sql.SmallInt, job_id)
                                                                                            .query(`
                                                                                                SELECT job_id, job_desc, min_lvl, max_lvl
                                                                                                FROM jobs
                                                                                                WHERE job_id = @job_id
                                                                                            `);

                                                                                        if (jobCheck.recordset.length === 0) {
                                                                                            return res.status(400).json({
                                                                                                message: 'Selected job does not exist.'
                                                                                            });
                                                                                        }

                                                                                        const selectedJob = jobCheck.recordset[0];

                                                                                        if (job_lvl < selectedJob.min_lvl || job_lvl > selectedJob.max_lvl) {
                                                                                            return res.status(400).json({
                                                                                                message: `Job level must be between ${selectedJob.min_lvl} and ${selectedJob.max_lvl} for ${selectedJob.job_desc}.`
                                                                                            });
                                                                                        }

                                                                                        const inviteToken = crypto.randomBytes(32).toString('hex');

                                                                                        const employeeName = `${fname} ${lname}`;
                                                                                        const inviteLink = `${process.env.FRONTEND_URL}/register-invite?token=${inviteToken}`;

                                                                                        // insert employee
                                                                                        await pool.request()
                                                                                            .input('emp_id', sql.Char(9), emp_id)
                                                                                            .input('fname', sql.VarChar(20), fname)
                                                                                            .input('minit', sql.Char(1), minit || null)
                                                                                            .input('lname', sql.VarChar(30), lname)
                                                                                            .input('job_id', sql.SmallInt, job_id)
                                                                                            .input('job_lvl', sql.TinyInt, job_lvl)
                                                                                            .input('pub_id', sql.Char(4), pub_id)
                                                                                            .query(`
                                                                                                INSERT INTO employee
                                                                                                    (
                                                                                                        emp_id,
                                                                                                        fname,
                                                                                                        minit,
                                                                                                        lname,
                                                                                                        job_id,
                                                                                                        job_lvl,
                                                                                                        pub_id,
                                                                                                        hire_date
                                                                                                    )
                                                                                                VALUES
                                                                                                    (
                                                                                                        @emp_id,
                                                                                                        @fname,
                                                                                                        @minit,
                                                                                                        @lname,
                                                                                                        @job_id,
                                                                                                        @job_lvl,
                                                                                                        @pub_id,
                                                                                                        GETDATE()
                                                                                                    )
                                                                                            `);

                                                                                        // create app user invite
                                                                                        await pool.request()
                                                                                            .input('emp_id', sql.Char(9), emp_id)
                                                                                            .input('email', sql.VarChar(255), email)
                                                                                            .input('invite_token', sql.VarChar(255), inviteToken)
                                                                                            .query(`
                                                                                                INSERT INTO app_users
                                                                                                    (
                                                                                                        emp_id,
                                                                                                        email,
                                                                                                        password_hash,
                                                                                                        email_confirmed,
                                                                                                        confirmation_token,
                                                                                                        is_admin,
                                                                                                        is_active,
                                                                                                        invite_token,
                                                                                                        invite_sent_at,
                                                                                                        password_set
                                                                                                    )
                                                                                                VALUES
                                                                                                    (
                                                                                                        @emp_id,
                                                                                                        @email,
                                                                                                        NULL,
                                                                                                        0,
                                                                                                        NULL,
                                                                                                        0,
                                                                                                        1,
                                                                                                        @invite_token,
                                                                                                        GETDATE(),
                                                                                                        0
                                                                                                    )
                                                                                            `);

                                                                                        // send registration email
                                                                                        console.log('Sending invite email to:', email);
                                                                                        console.log('Invite link created:', inviteLink);

                                                                                        const emailDebug = await sendInviteEmail(email, employeeName, inviteLink);

                                                                                        res.status(201).json({
                                                                                            message: 'Employee registered successfully. Invitation email has been sent.',
                                                                                            inviteLink: inviteLink,
                                                                                            emailDebug: emailDebug
                                                                                        });

                                                                                    } catch (err) {
                                                                                        console.error('Create employee invite error:', err);

                                                                                        res.status(500).json({
                                                                                            message: 'Error creating employee invite.',
                                                                                            error: err.message
                                                                                        });
                                                                                    }
                                                                                });







// ADMIN CREATE EMPLOYEE ONLY
// this creates employee record without app login account
// email is not required here because not every employee needs login access
app.post('/api/admin/employees', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            emp_id,
            fname,
            minit,
            lname,
            job_id,
            job_lvl,
            pub_id
        } = req.body;

        if (!emp_id || !fname || !lname || !job_id || !job_lvl || !pub_id) {
            return res.status(400).json({
                message: 'Employee ID, first name, last name, job, job level, and publisher are required.'
            });
        }

        const cleanEmpId = String(emp_id).trim().toUpperCase();
        const cleanFirstName = String(fname).trim();
        const cleanMiddleInitial = minit ? String(minit).trim().toUpperCase() : null;
        const cleanLastName = String(lname).trim();
        const cleanPubId = String(pub_id).trim();

        const parsedJobId = Number(job_id);
        const parsedJobLevel = Number(job_lvl);

        const empIdPattern = /^([A-Z]{3}|[A-Z]-[A-Z])[0-9]{5}[MF]$/i;

        if (!empIdPattern.test(cleanEmpId)) {
            return res.status(400).json({
                message: 'Employee ID must match the Pubs database rule. Use format like MBR99828M or M-B99828M.'
            });
        }

        if (!cleanFirstName) {
            return res.status(400).json({
                message: 'First name is required.'
            });
        }

        if (!cleanLastName) {
            return res.status(400).json({
                message: 'Last name is required.'
            });
        }

        if (!Number.isInteger(parsedJobId)) {
            return res.status(400).json({
                message: 'Valid job is required.'
            });
        }

        if (!Number.isInteger(parsedJobLevel)) {
            return res.status(400).json({
                message: 'Job level must be a whole number.'
            });
        }

        if (!cleanPubId) {
            return res.status(400).json({
                message: 'Publisher is required.'
            });
        }

        const pool = await sql.connect(dbConfig);

        // check if employee ID already exists
        const employeeCheck = await pool.request()
            .input('emp_id', sql.Char(9), cleanEmpId)
            .query(`
                SELECT emp_id
                FROM employee
                WHERE emp_id = @emp_id
            `);

        if (employeeCheck.recordset.length > 0) {
            return res.status(409).json({
                message: 'Employee ID already exists.'
            });
        }

        // check selected job and job level
        const jobCheck = await pool.request()
            .input('job_id', sql.SmallInt, parsedJobId)
            .query(`
                SELECT job_id, job_desc, min_lvl, max_lvl
                FROM jobs
                WHERE job_id = @job_id
            `);

        if (jobCheck.recordset.length === 0) {
            return res.status(400).json({
                message: 'Selected job does not exist.'
            });
        }

        const selectedJob = jobCheck.recordset[0];

        if (parsedJobLevel < selectedJob.min_lvl || parsedJobLevel > selectedJob.max_lvl) {
            return res.status(400).json({
                message: `Job level must be between ${selectedJob.min_lvl} and ${selectedJob.max_lvl} for ${selectedJob.job_desc}.`
            });
        }

        // check selected publisher
        const publisherCheck = await pool.request()
            .input('pub_id', sql.Char(4), cleanPubId)
            .query(`
                SELECT pub_id
                FROM publishers
                WHERE pub_id = @pub_id
            `);

        if (publisherCheck.recordset.length === 0) {
            return res.status(400).json({
                message: 'Selected publisher does not exist.'
            });
        }

        // insert employee only, no app_users record
        await pool.request()
            .input('emp_id', sql.Char(9), cleanEmpId)
            .input('fname', sql.VarChar(20), cleanFirstName)
            .input('minit', sql.Char(1), cleanMiddleInitial)
            .input('lname', sql.VarChar(30), cleanLastName)
            .input('job_id', sql.SmallInt, parsedJobId)
            .input('job_lvl', sql.TinyInt, parsedJobLevel)
            .input('pub_id', sql.Char(4), cleanPubId)
            .query(`
                INSERT INTO employee
                    (
                        emp_id,
                        fname,
                        minit,
                        lname,
                        job_id,
                        job_lvl,
                        pub_id,
                        hire_date
                    )
                VALUES
                    (
                        @emp_id,
                        @fname,
                        @minit,
                        @lname,
                        @job_id,
                        @job_lvl,
                        @pub_id,
                        GETDATE()
                    )
            `);

        res.status(201).json({
            message: 'Employee created successfully. No login account was created.'
        });

    } catch (err) {
        console.error('Create employee only error:', err);

        res.status(500).json({
            message: 'Error creating employee.',
            error: err.message
        });
    }
});











// GET EMPLOYEES AND APP USERS FOR ADMIN TABLE
// this returns employee records joined with app user account information
app.get('/api/admin/employees', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT
                e.emp_id,
                e.fname,
                e.minit,
                e.lname,
                e.job_id,
                e.job_lvl,
                e.pub_id,
                e.hire_date,

                j.job_desc,

                p.pub_name,

                u.user_id,
                u.email,
                u.email_confirmed,
                u.is_admin,
                u.is_active,
                u.invite_sent_at,
                u.password_set
            FROM employee e
            INNER JOIN jobs j ON e.job_id = j.job_id
            INNER JOIN publishers p ON e.pub_id = p.pub_id
            LEFT JOIN app_users u ON e.emp_id = u.emp_id
            ORDER BY e.lname, e.fname
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Get employees error:', err);

        res.status(500).json({
            message: 'Error getting employees.',
            error: err.message
        });
    }
});


                                                    // DELETE EMPLOYEE AND APP USER
                                                    // this is mainly for testing, it removes the app user first and then the employee record
                                                    // admin users cannot delete their own account
                                                    app.delete('/api/admin/employees/:emp_id', authenticateToken, requireAdmin, async (req, res) => {
                                                        try {
                                                            const empId = req.params.emp_id;

                                                            const loggedInEmpId = req.user.emp_id ? req.user.emp_id.trim() : '';
                                                            const targetEmpId = empId ? empId.trim() : '';

                                                            if (loggedInEmpId === targetEmpId) {
                                                                return res.status(400).json({
                                                                    message: 'You cannot delete your own account. Another administrator must delete or deactivate your account.'
                                                                });
                                                            }

                                                            const pool = await sql.connect(dbConfig);

                                                            // check if employee exists
                                                            const employeeCheck = await pool.request()
                                                                .input('emp_id', sql.Char(9), empId)
                                                                .query(`
                                                                    SELECT emp_id
                                                                    FROM employee
                                                                    WHERE emp_id = @emp_id
                                                                `);

                                                            if (employeeCheck.recordset.length === 0) {
                                                                return res.status(404).json({
                                                                    message: 'Employee not found.'
                                                                });
                                                            }

                                                            // check if this employee has an app user account
                                                            const appUserCheck = await pool.request()
                                                                .input('emp_id', sql.Char(9), empId)
                                                                .query(`
                                                                    SELECT
                                                                        user_id,
                                                                        is_admin,
                                                                        is_active
                                                                    FROM app_users
                                                                    WHERE emp_id = @emp_id
                                                                `);

                                                            const appUser = appUserCheck.recordset[0];

                                                            // do not allow deleting the last active admin
                                                            if (appUser && appUser.is_admin && appUser.is_active) {
                                                                const activeAdminCheck = await pool.request()
                                                                    .input('user_id', sql.Int, appUser.user_id)
                                                                    .query(`
                                                                        SELECT COUNT(*) AS activeAdminCount
                                                                        FROM app_users
                                                                        WHERE is_admin = 1
                                                                        AND is_active = 1
                                                                        AND user_id <> @user_id
                                                                    `);

                                                                const activeAdminCount = activeAdminCheck.recordset[0].activeAdminCount;

                                                                if (activeAdminCount === 0) {
                                                                    return res.status(400).json({
                                                                        message: 'You cannot delete the last active admin account.'
                                                                    });
                                                                }
                                                            }

                                                            // delete app user first because it depends on employee
                                                            await pool.request()
                                                                .input('emp_id', sql.Char(9), empId)
                                                                .query(`
                                                                    DELETE FROM app_users
                                                                    WHERE emp_id = @emp_id
                                                                `);

                                                            // delete employee after app user is removed
                                                            await pool.request()
                                                                .input('emp_id', sql.Char(9), empId)
                                                                .query(`
                                                                    DELETE FROM employee
                                                                    WHERE emp_id = @emp_id
                                                                `);

                                                            res.json({
                                                                message: 'Employee and app user deleted successfully.'
                                                            });

                                                        } catch (err) {
                                                            console.error('Delete employee user error:', err);

                                                            res.status(500).json({
                                                                message: 'Error deleting employee user.',
                                                                error: err.message
                                                            });
                                                        }
                                                    });









                                                                                                                // UPDATE EMPLOYEE AND APP USER SETTINGS
                                                            // this lets admin update employee position, publisher, job level, admin status, and active status
                                                            // admin users cannot remove their own admin rights or deactivate their own account
                                                            app.put('/api/admin/employees/:emp_id', authenticateToken, requireAdmin, async (req, res) => {
                                                                try {
                                                                    const empId = req.params.emp_id;

                                                                    const {
                                                                        fname,
                                                                        minit,
                                                                        lname,
                                                                        job_id,
                                                                        job_lvl,
                                                                        pub_id,
                                                                        is_admin,
                                                                        is_active
                                                                    } = req.body;

                                                                    if (!fname || !lname || !job_id || !job_lvl || !pub_id) {
                                                                        return res.status(400).json({
                                                                            message: 'First name, last name, job, job level, and publisher are required.'
                                                                        });
                                                                    }

                                                                    const pool = await sql.connect(dbConfig);

                                                                    // check if employee exists
                                                                    const employeeCheck = await pool.request()
                                                                        .input('emp_id', sql.Char(9), empId)
                                                                        .query(`
                                                                            SELECT emp_id
                                                                            FROM employee
                                                                            WHERE emp_id = @emp_id
                                                                        `);

                                                                    if (employeeCheck.recordset.length === 0) {
                                                                        return res.status(404).json({
                                                                            message: 'Employee not found.'
                                                                        });
                                                                    }

                                                                    // check selected job and job level
                                                                    const jobCheck = await pool.request()
                                                                        .input('job_id', sql.SmallInt, job_id)
                                                                        .query(`
                                                                            SELECT job_id, job_desc, min_lvl, max_lvl
                                                                            FROM jobs
                                                                            WHERE job_id = @job_id
                                                                        `);

                                                                    if (jobCheck.recordset.length === 0) {
                                                                        return res.status(400).json({
                                                                            message: 'Selected job does not exist.'
                                                                        });
                                                                    }

                                                                    const selectedJob = jobCheck.recordset[0];

                                                                    if (job_lvl < selectedJob.min_lvl || job_lvl > selectedJob.max_lvl) {
                                                                        return res.status(400).json({
                                                                            message: `Job level must be between ${selectedJob.min_lvl} and ${selectedJob.max_lvl} for ${selectedJob.job_desc}.`
                                                                        });
                                                                    }

                                                                    // check selected publisher
                                                                    const publisherCheck = await pool.request()
                                                                        .input('pub_id', sql.Char(4), pub_id)
                                                                        .query(`
                                                                            SELECT pub_id
                                                                            FROM publishers
                                                                            WHERE pub_id = @pub_id
                                                                        `);

                                                                    if (publisherCheck.recordset.length === 0) {
                                                                        return res.status(400).json({
                                                                            message: 'Selected publisher does not exist.'
                                                                        });
                                                                    }

                                                                    // check if this employee has an app user account
                                                                    const appUserCheck = await pool.request()
                                                                        .input('emp_id', sql.Char(9), empId)
                                                                        .query(`
                                                                            SELECT
                                                                                user_id,
                                                                                emp_id,
                                                                                is_admin,
                                                                                is_active
                                                                            FROM app_users
                                                                            WHERE emp_id = @emp_id
                                                                        `);

                                                                    const appUser = appUserCheck.recordset[0];

                                                                    const requestedIsAdmin = is_admin === true || is_admin === 1;
                                                                    const requestedIsActive = is_active === true || is_active === 1;

                                                                    const loggedInEmpId = req.user.emp_id ? req.user.emp_id.trim() : '';
                                                                    const targetEmpId = empId ? empId.trim() : '';

                                                                    const isUpdatingOwnAccount = loggedInEmpId === targetEmpId;

                                                                    // stop admin from removing his own admin rights
                                                                    if (appUser && isUpdatingOwnAccount && appUser.is_admin && !requestedIsAdmin) {
                                                                        return res.status(400).json({
                                                                            message: 'You cannot remove your own admin access. Another administrator must change your admin permissions.'
                                                                        });
                                                                    }

                                                                    // stop admin from deactivating his own account
                                                                    if (appUser && isUpdatingOwnAccount && !requestedIsActive) {
                                                                        return res.status(400).json({
                                                                            message: 'You cannot deactivate your own account. Another administrator must deactivate your account.'
                                                                        });
                                                                    }

                                                                    // safety check so admin does not remove the last active admin
                                                                    if (appUser && (!requestedIsAdmin || !requestedIsActive)) {
                                                                        const activeAdminCheck = await pool.request()
                                                                            .input('user_id', sql.Int, appUser.user_id)
                                                                            .query(`
                                                                                SELECT COUNT(*) AS activeAdminCount
                                                                                FROM app_users
                                                                                WHERE is_admin = 1
                                                                                AND is_active = 1
                                                                                AND user_id <> @user_id
                                                                            `);

                                                                        const activeAdminCount = activeAdminCheck.recordset[0].activeAdminCount;

                                                                        if (appUser.is_admin && activeAdminCount === 0) {
                                                                            return res.status(400).json({
                                                                                message: 'You cannot remove or disable the last active admin account.'
                                                                            });
                                                                        }
                                                                    }

                                                                    // update employee business record
                                                                    await pool.request()
                                                                        .input('emp_id', sql.Char(9), empId)
                                                                        .input('fname', sql.VarChar(20), fname)
                                                                        .input('minit', sql.Char(1), minit || null)
                                                                        .input('lname', sql.VarChar(30), lname)
                                                                        .input('job_id', sql.SmallInt, job_id)
                                                                        .input('job_lvl', sql.TinyInt, job_lvl)
                                                                        .input('pub_id', sql.Char(4), pub_id)
                                                                        .query(`
                                                                            UPDATE employee
                                                                            SET
                                                                                fname = @fname,
                                                                                minit = @minit,
                                                                                lname = @lname,
                                                                                job_id = @job_id,
                                                                                job_lvl = @job_lvl,
                                                                                pub_id = @pub_id
                                                                            WHERE emp_id = @emp_id
                                                                        `);

                                                                    // update app user settings only if this employee has login account
                                                                    if (appUser) {
                                                                        await pool.request()
                                                                            .input('emp_id', sql.Char(9), empId)
                                                                            .input('is_admin', sql.Bit, requestedIsAdmin ? 1 : 0)
                                                                            .input('is_active', sql.Bit, requestedIsActive ? 1 : 0)
                                                                            .query(`
                                                                                UPDATE app_users
                                                                                SET
                                                                                    is_admin = @is_admin,
                                                                                    is_active = @is_active
                                                                                WHERE emp_id = @emp_id
                                                                            `);
                                                                    }

                                                                    res.json({
                                                                        message: 'Employee and user settings updated successfully.'
                                                                    });

                                                                } catch (err) {
                                                                    console.error('Update employee user settings error:', err);

                                                                    res.status(500).json({
                                                                        message: 'Error updating employee user settings.',
                                                                        error: err.message
                                                                    });
                                                                }
                                                            });
















                                                                           


                                                                    // GET INVITE INFORMATION BY TOKEN
                                                    // this is used when invited employee opens email link
                                                    app.get('/api/auth/invite/:token', async (req, res) => {
                                                        try {
                                                            const token = req.params.token;

                                                            const pool = await sql.connect(dbConfig);

                                                            const result = await pool.request()
                                                                .input('invite_token', sql.VarChar(255), token)
                                                                .query(`
                                                                    SELECT
                                                                        u.user_id,
                                                                        u.emp_id,
                                                                        u.email,
                                                                        u.email_confirmed,
                                                                        u.password_set,
                                                                        u.is_active,

                                                                        e.fname,
                                                                        e.minit,
                                                                        e.lname,
                                                                        e.job_id,
                                                                        e.job_lvl,
                                                                        e.pub_id,
                                                                        e.hire_date,

                                                                        j.job_desc
                                                                    FROM app_users u
                                                                    INNER JOIN employee e ON u.emp_id = e.emp_id
                                                                    INNER JOIN jobs j ON e.job_id = j.job_id
                                                                    WHERE u.invite_token = @invite_token
                                                                `);

                                                            if (result.recordset.length === 0) {
                                                                return res.status(404).json({
                                                                    message: 'Invalid or expired invitation link.'
                                                                });
                                                            }

                                                            const invite = result.recordset[0];

                                                            if (!invite.is_active) {
                                                                return res.status(403).json({
                                                                    message: 'This account is disabled.'
                                                                });
                                                            }

                                                            if (invite.password_set) {
                                                                return res.status(400).json({
                                                                    message: 'This invitation has already been completed.'
                                                                });
                                                            }

                                                            res.json({
                                                                user_id: invite.user_id,
                                                                emp_id: invite.emp_id,
                                                                email: invite.email,
                                                                fname: invite.fname,
                                                                minit: invite.minit,
                                                                lname: invite.lname,
                                                                job_id: invite.job_id,
                                                                job_desc: invite.job_desc,
                                                                job_lvl: invite.job_lvl,
                                                                pub_id: invite.pub_id,
                                                                hire_date: invite.hire_date
                                                            });

                                                        } catch (err) {
                                                            console.error('Get invite error:', err);

                                                            res.status(500).json({
                                                                message: 'Error loading invitation.',
                                                                error: err.message
                                                            });
                                                        }
                                                    });                                                  





                                                                    // COMPLETE INVITE REGISTRATION
                                                            // invited employee creates password here
                                                            app.post('/api/auth/complete-invite', async (req, res) => {
                                                                try {
                                                                    const {
                                                                        token,
                                                                        password,
                                                                        confirmPassword
                                                                    } = req.body;

                                                                    if (!token || !password || !confirmPassword) {
                                                                        return res.status(400).json({
                                                                            message: 'Token, password, and confirm password are required.'
                                                                        });
                                                                    }

                                                                    if (password !== confirmPassword) {
                                                                        return res.status(400).json({
                                                                            message: 'Passwords do not match.'
                                                                        });
                                                                    }

                                                                    if (password.length < 6) {
                                                                        return res.status(400).json({
                                                                            message: 'Password must be at least 6 characters.'
                                                                        });
                                                                    }

                                                                    const pool = await sql.connect(dbConfig);

                                                                    const result = await pool.request()
                                                                        .input('invite_token', sql.VarChar(255), token)
                                                                        .query(`
                                                                            SELECT
                                                                                user_id,
                                                                                emp_id,
                                                                                email,
                                                                                password_set,
                                                                                is_active
                                                                            FROM app_users
                                                                            WHERE invite_token = @invite_token
                                                                        `);

                                                                    if (result.recordset.length === 0) {
                                                                        return res.status(404).json({
                                                                            message: 'Invalid or expired invitation link.'
                                                                        });
                                                                    }

                                                                    const user = result.recordset[0];

                                                                    if (!user.is_active) {
                                                                        return res.status(403).json({
                                                                            message: 'This account is disabled.'
                                                                        });
                                                                    }

                                                                    if (user.password_set) {
                                                                        return res.status(400).json({
                                                                            message: 'This invitation has already been completed.'
                                                                        });
                                                                    }

                                                                    const passwordHash = await bcrypt.hash(password, 10);

                                                                    await pool.request()
                                                                        .input('user_id', sql.Int, user.user_id)
                                                                        .input('password_hash', sql.VarChar(255), passwordHash)
                                                                        .query(`
                                                                            UPDATE app_users
                                                                            SET
                                                                                password_hash = @password_hash,
                                                                                email_confirmed = 1,
                                                                                confirmation_token = NULL,
                                                                                invite_token = NULL,
                                                                                password_set = 1
                                                                            WHERE user_id = @user_id
                                                                        `);

                                                                    res.json({
                                                                        message: 'Registration completed successfully. You can now login.'
                                                                    });

                                                                } catch (err) {
                                                                    console.error('Complete invite error:', err);

                                                                    res.status(500).json({
                                                                        message: 'Error completing registration.',
                                                                        error: err.message
                                                                    });
                                                                }
                                                            });












                                    // JOBS MANAGEMENT ROUTES
                                    // these routes are used for viewing, creating, editing, and deleting jobs
                                    // jobs are connected to employees, so we do not delete a job if employees are assigned to it



                                    // GET JOBS FOR ADMIN EMPLOYEE FORM AND JOBS MANAGEMENT PAGE
                                    app.get('/api/admin/jobs', authenticateToken, requireAdmin, async (req, res) => {
                                        try {
                                            const pool = await sql.connect(dbConfig);

                                            const result = await pool.request().query(`
                                                SELECT
                                                    job_id,
                                                    job_desc,
                                                    min_lvl,
                                                    max_lvl
                                                FROM jobs
                                                ORDER BY job_id
                                            `);

                                            res.json(result.recordset);
                                        } catch (err) {
                                            console.error('Get jobs error:', err);

                                            res.status(500).json({
                                                message: 'Error getting jobs.',
                                                error: err.message
                                            });
                                        }
                                    });



                                    // CREATE NEW JOB
                                    app.post('/api/admin/jobs', authenticateToken, requireAdmin, async (req, res) => {
                                        try {
                                            const {
                                                job_desc,
                                                min_lvl,
                                                max_lvl
                                            } = req.body;

                                            if (!job_desc || min_lvl === null || min_lvl === undefined || max_lvl === null || max_lvl === undefined) {
                                                return res.status(400).json({
                                                    message: 'Job description, minimum level, and maximum level are required.'
                                                });
                                            }

                                            const cleanJobDesc = job_desc.trim();

                                            const parsedMinLevel = Number(min_lvl);
                                            const parsedMaxLevel = Number(max_lvl);

                                            if (!cleanJobDesc) {
                                                return res.status(400).json({
                                                    message: 'Job description is required.'
                                                });
                                            }

                                            if (!Number.isInteger(parsedMinLevel) || !Number.isInteger(parsedMaxLevel)) {
                                                return res.status(400).json({
                                                    message: 'Minimum level and maximum level must be whole numbers.'
                                                });
                                            }

                                            if (parsedMinLevel < 1 || parsedMinLevel > 255 || parsedMaxLevel < 1 || parsedMaxLevel > 255) {
                                                return res.status(400).json({
                                                    message: 'Job levels must be between 1 and 255.'
                                                });
                                            }

                                            if (parsedMinLevel > parsedMaxLevel) {
                                                return res.status(400).json({
                                                    message: 'Minimum level cannot be greater than maximum level.'
                                                });
                                            }

                                            const pool = await sql.connect(dbConfig);

                                            // check if job description already exists
                                            const duplicateCheck = await pool.request()
                                                .input('job_desc', sql.VarChar(50), cleanJobDesc)
                                                .query(`
                                                    SELECT job_id
                                                    FROM jobs
                                                    WHERE LOWER(LTRIM(RTRIM(job_desc))) = LOWER(LTRIM(RTRIM(@job_desc)))
                                                `);

                                            if (duplicateCheck.recordset.length > 0) {
                                                return res.status(409).json({
                                                    message: 'A job with this description already exists.'
                                                });
                                            }

                                            const result = await pool.request()
                                                .input('job_desc', sql.VarChar(50), cleanJobDesc)
                                                .input('min_lvl', sql.TinyInt, parsedMinLevel)
                                                .input('max_lvl', sql.TinyInt, parsedMaxLevel)
                                                .query(`
                                                    INSERT INTO jobs
                                                        (
                                                            job_desc,
                                                            min_lvl,
                                                            max_lvl
                                                        )
                                                    OUTPUT
                                                        INSERTED.job_id,
                                                        INSERTED.job_desc,
                                                        INSERTED.min_lvl,
                                                        INSERTED.max_lvl
                                                    VALUES
                                                        (
                                                            @job_desc,
                                                            @min_lvl,
                                                            @max_lvl
                                                        )
                                                `);

                                            res.status(201).json({
                                                message: 'Job created successfully.',
                                                job: result.recordset[0]
                                            });

                                        } catch (err) {
                                            console.error('Create job error:', err);

                                            res.status(500).json({
                                                message: 'Error creating job.',
                                                error: err.message
                                            });
                                        }
                                    });



                                    // UPDATE EXISTING JOB
                                    app.put('/api/admin/jobs/:job_id', authenticateToken, requireAdmin, async (req, res) => {
                                        try {
                                            const jobId = Number(req.params.job_id);

                                            const {
                                                job_desc,
                                                min_lvl,
                                                max_lvl
                                            } = req.body;

                                            if (!Number.isInteger(jobId)) {
                                                return res.status(400).json({
                                                    message: 'Valid job ID is required.'
                                                });
                                            }

                                            if (!job_desc || min_lvl === null || min_lvl === undefined || max_lvl === null || max_lvl === undefined) {
                                                return res.status(400).json({
                                                    message: 'Job description, minimum level, and maximum level are required.'
                                                });
                                            }

                                            const cleanJobDesc = job_desc.trim();

                                            const parsedMinLevel = Number(min_lvl);
                                            const parsedMaxLevel = Number(max_lvl);

                                            if (!cleanJobDesc) {
                                                return res.status(400).json({
                                                    message: 'Job description is required.'
                                                });
                                            }

                                            if (!Number.isInteger(parsedMinLevel) || !Number.isInteger(parsedMaxLevel)) {
                                                return res.status(400).json({
                                                    message: 'Minimum level and maximum level must be whole numbers.'
                                                });
                                            }

                                            if (parsedMinLevel < 1 || parsedMinLevel > 255 || parsedMaxLevel < 1 || parsedMaxLevel > 255) {
                                                return res.status(400).json({
                                                    message: 'Job levels must be between 1 and 255.'
                                                });
                                            }

                                            if (parsedMinLevel > parsedMaxLevel) {
                                                return res.status(400).json({
                                                    message: 'Minimum level cannot be greater than maximum level.'
                                                });
                                            }

                                            const pool = await sql.connect(dbConfig);

                                            // check if job exists
                                            const jobCheck = await pool.request()
                                                .input('job_id', sql.SmallInt, jobId)
                                                .query(`
                                                    SELECT job_id
                                                    FROM jobs
                                                    WHERE job_id = @job_id
                                                `);

                                            if (jobCheck.recordset.length === 0) {
                                                return res.status(404).json({
                                                    message: 'Job not found.'
                                                });
                                            }

                                            // check duplicate description but ignore the current job
                                            const duplicateCheck = await pool.request()
                                                .input('job_id', sql.SmallInt, jobId)
                                                .input('job_desc', sql.VarChar(50), cleanJobDesc)
                                                .query(`
                                                    SELECT job_id
                                                    FROM jobs
                                                    WHERE LOWER(LTRIM(RTRIM(job_desc))) = LOWER(LTRIM(RTRIM(@job_desc)))
                                                    AND job_id <> @job_id
                                                `);

                                            if (duplicateCheck.recordset.length > 0) {
                                                return res.status(409).json({
                                                    message: 'Another job with this description already exists.'
                                                });
                                            }

                                            await pool.request()
                                                .input('job_id', sql.SmallInt, jobId)
                                                .input('job_desc', sql.VarChar(50), cleanJobDesc)
                                                .input('min_lvl', sql.TinyInt, parsedMinLevel)
                                                .input('max_lvl', sql.TinyInt, parsedMaxLevel)
                                                .query(`
                                                    UPDATE jobs
                                                    SET
                                                        job_desc = @job_desc,
                                                        min_lvl = @min_lvl,
                                                        max_lvl = @max_lvl
                                                    WHERE job_id = @job_id
                                                `);

                                            res.json({
                                                message: 'Job updated successfully.'
                                            });

                                        } catch (err) {
                                            console.error('Update job error:', err);

                                            res.status(500).json({
                                                message: 'Error updating job.',
                                                error: err.message
                                            });
                                        }
                                    });



                                    // DELETE JOB
                                    app.delete('/api/admin/jobs/:job_id', authenticateToken, requireAdmin, async (req, res) => {
                                        try {
                                            const jobId = Number(req.params.job_id);

                                            if (!Number.isInteger(jobId)) {
                                                return res.status(400).json({
                                                    message: 'Valid job ID is required.'
                                                });
                                            }

                                            const pool = await sql.connect(dbConfig);

                                            // check if job exists
                                            const jobCheck = await pool.request()
                                                .input('job_id', sql.SmallInt, jobId)
                                                .query(`
                                                    SELECT job_id, job_desc
                                                    FROM jobs
                                                    WHERE job_id = @job_id
                                                `);

                                            if (jobCheck.recordset.length === 0) {
                                                return res.status(404).json({
                                                    message: 'Job not found.'
                                                });
                                            }

                                            // check if employees are using this job
                                            const employeeCheck = await pool.request()
                                                .input('job_id', sql.SmallInt, jobId)
                                                .query(`
                                                    SELECT COUNT(*) AS employeeCount
                                                    FROM employee
                                                    WHERE job_id = @job_id
                                                `);

                                            const employeeCount = employeeCheck.recordset[0].employeeCount;

                                            if (employeeCount > 0) {
                                                return res.status(400).json({
                                                    message: `This job cannot be deleted because ${employeeCount} employee record(s) are assigned to it. Reassign those employees first.`
                                                });
                                            }

                                            await pool.request()
                                                .input('job_id', sql.SmallInt, jobId)
                                                .query(`
                                                    DELETE FROM jobs
                                                    WHERE job_id = @job_id
                                                `);

                                            res.json({
                                                message: 'Job deleted successfully.'
                                            });

                                        } catch (err) {
                                            console.error('Delete job error:', err);

                                            res.status(500).json({
                                                message: 'Error deleting job.',
                                                error: err.message
                                            });
                                        }
                                    });








                                    //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<










// PUBLISHERS MANAGEMENT ROUTES
// these routes are used for viewing, creating, editing, and deleting publishers
// publishers are connected to employees, titles, and publisher info
// because of that, we do not delete publisher if other records are using it



// GET PUBLISHERS FOR ADMIN EMPLOYEE FORM AND PUBLISHERS MANAGEMENT PAGE
app.get('/api/admin/publishers', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT
                pub_id,
                pub_name,
                city,
                state,
                country
            FROM publishers
            ORDER BY pub_name
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Get publishers error:', err);

        res.status(500).json({
            message: 'Error getting publishers.',
            error: err.message
        });
    }
});



// CREATE NEW PUBLISHER
app.post('/api/admin/publishers', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            pub_id,
            pub_name,
            city,
            state,
            country
        } = req.body;

        if (!pub_id || !pub_name) {
            return res.status(400).json({
                message: 'Publisher ID and publisher name are required.'
            });
        }

        const cleanPubId = pub_id.trim();
        const cleanPubName = pub_name.trim();
        const cleanCity = city ? city.trim() : null;
        const cleanState = state ? state.trim().toUpperCase() : null;
        const cleanCountry = country ? country.trim() : null;

        if (cleanPubId.length !== 4) {
            return res.status(400).json({
                message: 'Publisher ID must be exactly 4 characters.'
            });
        }

        if (!cleanPubName) {
            return res.status(400).json({
                message: 'Publisher name is required.'
            });
        }

        if (cleanPubName.length > 40) {
            return res.status(400).json({
                message: 'Publisher name cannot be longer than 40 characters.'
            });
        }

        if (cleanCity && cleanCity.length > 20) {
            return res.status(400).json({
                message: 'City cannot be longer than 20 characters.'
            });
        }

        if (cleanState && cleanState.length > 2) {
            return res.status(400).json({
                message: 'State must be 2 characters or less.'
            });
        }

        if (cleanCountry && cleanCountry.length > 30) {
            return res.status(400).json({
                message: 'Country cannot be longer than 30 characters.'
            });
        }

        const pool = await sql.connect(dbConfig);

        // check if publisher ID already exists
        const idCheck = await pool.request()
            .input('pub_id', sql.Char(4), cleanPubId)
            .query(`
                SELECT pub_id
                FROM publishers
                WHERE pub_id = @pub_id
            `);

        if (idCheck.recordset.length > 0) {
            return res.status(409).json({
                message: 'Publisher ID already exists.'
            });
        }

        // check if publisher name already exists
        const nameCheck = await pool.request()
            .input('pub_name', sql.VarChar(40), cleanPubName)
            .query(`
                SELECT pub_id
                FROM publishers
                WHERE LOWER(LTRIM(RTRIM(pub_name))) = LOWER(LTRIM(RTRIM(@pub_name)))
            `);

        if (nameCheck.recordset.length > 0) {
            return res.status(409).json({
                message: 'A publisher with this name already exists.'
            });
        }

        const result = await pool.request()
            .input('pub_id', sql.Char(4), cleanPubId)
            .input('pub_name', sql.VarChar(40), cleanPubName)
            .input('city', sql.VarChar(20), cleanCity)
            .input('state', sql.Char(2), cleanState)
            .input('country', sql.VarChar(30), cleanCountry)
            .query(`
                INSERT INTO publishers
                    (
                        pub_id,
                        pub_name,
                        city,
                        state,
                        country
                    )
                OUTPUT
                    INSERTED.pub_id,
                    INSERTED.pub_name,
                    INSERTED.city,
                    INSERTED.state,
                    INSERTED.country
                VALUES
                    (
                        @pub_id,
                        @pub_name,
                        @city,
                        @state,
                        @country
                    )
            `);

        res.status(201).json({
            message: 'Publisher created successfully.',
            publisher: result.recordset[0]
        });

    } catch (err) {
        console.error('Create publisher error:', err);

        res.status(500).json({
            message: 'Error creating publisher.',
            error: err.message
        });
    }
});



// UPDATE EXISTING PUBLISHER
app.put('/api/admin/publishers/:pub_id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const pubId = req.params.pub_id;

        const {
            pub_name,
            city,
            state,
            country
        } = req.body;

        if (!pubId || !pub_name) {
            return res.status(400).json({
                message: 'Publisher ID and publisher name are required.'
            });
        }

        const cleanPubId = pubId.trim();
        const cleanPubName = pub_name.trim();
        const cleanCity = city ? city.trim() : null;
        const cleanState = state ? state.trim().toUpperCase() : null;
        const cleanCountry = country ? country.trim() : null;

        if (cleanPubId.length !== 4) {
            return res.status(400).json({
                message: 'Publisher ID must be exactly 4 characters.'
            });
        }

        if (!cleanPubName) {
            return res.status(400).json({
                message: 'Publisher name is required.'
            });
        }

        if (cleanPubName.length > 40) {
            return res.status(400).json({
                message: 'Publisher name cannot be longer than 40 characters.'
            });
        }

        if (cleanCity && cleanCity.length > 20) {
            return res.status(400).json({
                message: 'City cannot be longer than 20 characters.'
            });
        }

        if (cleanState && cleanState.length > 2) {
            return res.status(400).json({
                message: 'State must be 2 characters or less.'
            });
        }

        if (cleanCountry && cleanCountry.length > 30) {
            return res.status(400).json({
                message: 'Country cannot be longer than 30 characters.'
            });
        }

        const pool = await sql.connect(dbConfig);

        // check if publisher exists
        const publisherCheck = await pool.request()
            .input('pub_id', sql.Char(4), cleanPubId)
            .query(`
                SELECT pub_id
                FROM publishers
                WHERE pub_id = @pub_id
            `);

        if (publisherCheck.recordset.length === 0) {
            return res.status(404).json({
                message: 'Publisher not found.'
            });
        }

        // check duplicate publisher name but ignore current publisher
        const duplicateCheck = await pool.request()
            .input('pub_id', sql.Char(4), cleanPubId)
            .input('pub_name', sql.VarChar(40), cleanPubName)
            .query(`
                SELECT pub_id
                FROM publishers
                WHERE LOWER(LTRIM(RTRIM(pub_name))) = LOWER(LTRIM(RTRIM(@pub_name)))
                AND pub_id <> @pub_id
            `);

        if (duplicateCheck.recordset.length > 0) {
            return res.status(409).json({
                message: 'Another publisher with this name already exists.'
            });
        }

        await pool.request()
            .input('pub_id', sql.Char(4), cleanPubId)
            .input('pub_name', sql.VarChar(40), cleanPubName)
            .input('city', sql.VarChar(20), cleanCity)
            .input('state', sql.Char(2), cleanState)
            .input('country', sql.VarChar(30), cleanCountry)
            .query(`
                UPDATE publishers
                SET
                    pub_name = @pub_name,
                    city = @city,
                    state = @state,
                    country = @country
                WHERE pub_id = @pub_id
            `);

        res.json({
            message: 'Publisher updated successfully.'
        });

    } catch (err) {
        console.error('Update publisher error:', err);

        res.status(500).json({
            message: 'Error updating publisher.',
            error: err.message
        });
    }
});



// DELETE PUBLISHER
app.delete('/api/admin/publishers/:pub_id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const pubId = req.params.pub_id;

        if (!pubId || pubId.trim().length !== 4) {
            return res.status(400).json({
                message: 'Valid publisher ID is required.'
            });
        }

        const cleanPubId = pubId.trim();

        const pool = await sql.connect(dbConfig);

        // check if publisher exists
        const publisherCheck = await pool.request()
            .input('pub_id', sql.Char(4), cleanPubId)
            .query(`
                SELECT pub_id, pub_name
                FROM publishers
                WHERE pub_id = @pub_id
            `);

        if (publisherCheck.recordset.length === 0) {
            return res.status(404).json({
                message: 'Publisher not found.'
            });
        }

        // check if employees are using this publisher
        const employeeCheck = await pool.request()
            .input('pub_id', sql.Char(4), cleanPubId)
            .query(`
                SELECT COUNT(*) AS employeeCount
                FROM employee
                WHERE pub_id = @pub_id
            `);

        const employeeCount = employeeCheck.recordset[0].employeeCount;

        if (employeeCount > 0) {
            return res.status(400).json({
                message: `This publisher cannot be deleted because ${employeeCount} employee record(s) are assigned to it. Reassign those employees first.`
            });
        }

        // check if titles are using this publisher
        const titleCheck = await pool.request()
            .input('pub_id', sql.Char(4), cleanPubId)
            .query(`
                SELECT COUNT(*) AS titleCount
                FROM titles
                WHERE pub_id = @pub_id
            `);

        const titleCount = titleCheck.recordset[0].titleCount;

        if (titleCount > 0) {
            return res.status(400).json({
                message: `This publisher cannot be deleted because ${titleCount} title record(s) are assigned to it. Reassign those titles first.`
            });
        }

        // check if publisher info is using this publisher
        const publisherInfoCheck = await pool.request()
            .input('pub_id', sql.Char(4), cleanPubId)
            .query(`
                SELECT COUNT(*) AS publisherInfoCount
                FROM pub_info
                WHERE pub_id = @pub_id
            `);

        const publisherInfoCount = publisherInfoCheck.recordset[0].publisherInfoCount;

        if (publisherInfoCount > 0) {
            return res.status(400).json({
                message: 'This publisher cannot be deleted because publisher information is connected to it. Delete or update the publisher info first.'
            });
        }

        await pool.request()
            .input('pub_id', sql.Char(4), cleanPubId)
            .query(`
                DELETE FROM publishers
                WHERE pub_id = @pub_id
            `);

        res.json({
            message: 'Publisher deleted successfully.'
        });

    } catch (err) {
        console.error('Delete publisher error:', err);

        res.status(500).json({
            message: 'Error deleting publisher.',
            error: err.message
        });
    }
});






//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


// TITLES MANAGEMENT ROUTES
// these routes are used for viewing, creating, editing, and deleting titles
// titles are connected to publishers, sales, title authors, and royalty schedules
// because of that, we do not delete a title if other records are using it



// GET TITLES FOR TITLES MANAGEMENT PAGE
app.get('/api/admin/titles', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT
                t.title_id,
                t.title,
                t.type,
                t.pub_id,
                t.price,
                t.advance,
                t.royalty,
                t.ytd_sales,
                t.notes,
                t.pubdate,

                p.pub_name
            FROM titles t
            LEFT JOIN publishers p ON t.pub_id = p.pub_id
            ORDER BY t.title
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Get titles error:', err);

        res.status(500).json({
            message: 'Error getting titles.',
            error: err.message
        });
    }
});



// CREATE NEW TITLE
app.post('/api/admin/titles', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            title_id,
            title,
            type,
            pub_id,
            price,
            advance,
            royalty,
            ytd_sales,
            notes,
            pubdate
        } = req.body;

        if (!title_id || !title || !type || !pub_id || !pubdate) {
            return res.status(400).json({
                message: 'Title ID, title name, type, publisher, and publication date are required.'
            });
        }

        const cleanTitleId = title_id.trim().toUpperCase();
        const cleanTitle = title.trim();
        const cleanType = type.trim();
        const cleanPubId = pub_id.trim();

        const cleanNotes = notes ? notes.trim() : null;

        const parsedPrice = price === null || price === undefined || price === '' ? null : Number(price);
        const parsedAdvance = advance === null || advance === undefined || advance === '' ? null : Number(advance);
        const parsedRoyalty = royalty === null || royalty === undefined || royalty === '' ? null : Number(royalty);
        const parsedYtdSales = ytd_sales === null || ytd_sales === undefined || ytd_sales === '' ? null : Number(ytd_sales);

        const parsedPubDate = new Date(pubdate);

        if (!/^[A-Z]{2}[0-9]{4}$/.test(cleanTitleId)) {
            return res.status(400).json({
                message: 'Title ID must be 6 characters in this format: two letters followed by four numbers. Example: BU9999.'
            });
        }

        if (!cleanTitle) {
            return res.status(400).json({
                message: 'Title name is required.'
            });
        }

        if (cleanTitle.length > 80) {
            return res.status(400).json({
                message: 'Title name cannot be longer than 80 characters.'
            });
        }

        if (!cleanType) {
            return res.status(400).json({
                message: 'Title type is required.'
            });
        }

        if (cleanType.length > 12) {
            return res.status(400).json({
                message: 'Title type cannot be longer than 12 characters.'
            });
        }

        if (cleanPubId.length !== 4) {
            return res.status(400).json({
                message: 'Publisher ID must be exactly 4 characters.'
            });
        }

        if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
            return res.status(400).json({
                message: 'Price must be a valid positive number.'
            });
        }

        if (parsedAdvance !== null && (Number.isNaN(parsedAdvance) || parsedAdvance < 0)) {
            return res.status(400).json({
                message: 'Advance must be a valid positive number.'
            });
        }

        if (parsedRoyalty !== null && (!Number.isInteger(parsedRoyalty) || parsedRoyalty < 0 || parsedRoyalty > 100)) {
            return res.status(400).json({
                message: 'Royalty must be a whole number between 0 and 100.'
            });
        }

        if (parsedYtdSales !== null && (!Number.isInteger(parsedYtdSales) || parsedYtdSales < 0)) {
            return res.status(400).json({
                message: 'Year-to-date sales must be a whole number greater than or equal to 0.'
            });
        }

        if (cleanNotes && cleanNotes.length > 200) {
            return res.status(400).json({
                message: 'Notes cannot be longer than 200 characters.'
            });
        }

        if (Number.isNaN(parsedPubDate.getTime())) {
            return res.status(400).json({
                message: 'Publication date is not valid.'
            });
        }

        const pool = await sql.connect(dbConfig);

        // check if title ID already exists
        const titleIdCheck = await pool.request()
            .input('title_id', sql.VarChar(6), cleanTitleId)
            .query(`
                SELECT title_id
                FROM titles
                WHERE title_id = @title_id
            `);

        if (titleIdCheck.recordset.length > 0) {
            return res.status(409).json({
                message: 'Title ID already exists.'
            });
        }

        // check if title name already exists
        const titleNameCheck = await pool.request()
            .input('title', sql.VarChar(80), cleanTitle)
            .query(`
                SELECT title_id
                FROM titles
                WHERE LOWER(LTRIM(RTRIM(title))) = LOWER(LTRIM(RTRIM(@title)))
            `);

        if (titleNameCheck.recordset.length > 0) {
            return res.status(409).json({
                message: 'A title with this name already exists.'
            });
        }

        // check selected publisher exists
        const publisherCheck = await pool.request()
            .input('pub_id', sql.Char(4), cleanPubId)
            .query(`
                SELECT pub_id
                FROM publishers
                WHERE pub_id = @pub_id
            `);

        if (publisherCheck.recordset.length === 0) {
            return res.status(400).json({
                message: 'Selected publisher does not exist.'
            });
        }

        const result = await pool.request()
            .input('title_id', sql.VarChar(6), cleanTitleId)
            .input('title', sql.VarChar(80), cleanTitle)
            .input('type', sql.Char(12), cleanType)
            .input('pub_id', sql.Char(4), cleanPubId)
            .input('price', sql.Money, parsedPrice)
            .input('advance', sql.Money, parsedAdvance)
            .input('royalty', sql.Int, parsedRoyalty)
            .input('ytd_sales', sql.Int, parsedYtdSales)
            .input('notes', sql.VarChar(200), cleanNotes)
            .input('pubdate', sql.DateTime, parsedPubDate)
            .query(`
                INSERT INTO titles
                    (
                        title_id,
                        title,
                        type,
                        pub_id,
                        price,
                        advance,
                        royalty,
                        ytd_sales,
                        notes,
                        pubdate
                    )
                OUTPUT
                    INSERTED.title_id,
                    INSERTED.title,
                    INSERTED.type,
                    INSERTED.pub_id,
                    INSERTED.price,
                    INSERTED.advance,
                    INSERTED.royalty,
                    INSERTED.ytd_sales,
                    INSERTED.notes,
                    INSERTED.pubdate
                VALUES
                    (
                        @title_id,
                        @title,
                        @type,
                        @pub_id,
                        @price,
                        @advance,
                        @royalty,
                        @ytd_sales,
                        @notes,
                        @pubdate
                    )
            `);

        res.status(201).json({
            message: 'Title created successfully.',
            title: result.recordset[0]
        });

    } catch (err) {
        console.error('Create title error:', err);

        res.status(500).json({
            message: 'Error creating title.',
            error: err.message
        });
    }
});



// UPDATE EXISTING TITLE
app.put('/api/admin/titles/:title_id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const titleId = req.params.title_id;

        const {
            title,
            type,
            pub_id,
            price,
            advance,
            royalty,
            ytd_sales,
            notes,
            pubdate
        } = req.body;

        if (!titleId || !title || !type || !pub_id || !pubdate) {
            return res.status(400).json({
                message: 'Title ID, title name, type, publisher, and publication date are required.'
            });
        }

        const cleanTitleId = titleId.trim().toUpperCase();
        const cleanTitle = title.trim();
        const cleanType = type.trim();
        const cleanPubId = pub_id.trim();

        const cleanNotes = notes ? notes.trim() : null;

        const parsedPrice = price === null || price === undefined || price === '' ? null : Number(price);
        const parsedAdvance = advance === null || advance === undefined || advance === '' ? null : Number(advance);
        const parsedRoyalty = royalty === null || royalty === undefined || royalty === '' ? null : Number(royalty);
        const parsedYtdSales = ytd_sales === null || ytd_sales === undefined || ytd_sales === '' ? null : Number(ytd_sales);

        const parsedPubDate = new Date(pubdate);

        if (!/^[A-Z]{2}[0-9]{4}$/.test(cleanTitleId)) {
            return res.status(400).json({
                message: 'Title ID must be 6 characters in this format: two letters followed by four numbers. Example: BU9999.'
            });
        }

        if (!cleanTitle) {
            return res.status(400).json({
                message: 'Title name is required.'
            });
        }

        if (cleanTitle.length > 80) {
            return res.status(400).json({
                message: 'Title name cannot be longer than 80 characters.'
            });
        }

        if (!cleanType) {
            return res.status(400).json({
                message: 'Title type is required.'
            });
        }

        if (cleanType.length > 12) {
            return res.status(400).json({
                message: 'Title type cannot be longer than 12 characters.'
            });
        }

        if (cleanPubId.length !== 4) {
            return res.status(400).json({
                message: 'Publisher ID must be exactly 4 characters.'
            });
        }

        if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
            return res.status(400).json({
                message: 'Price must be a valid positive number.'
            });
        }

        if (parsedAdvance !== null && (Number.isNaN(parsedAdvance) || parsedAdvance < 0)) {
            return res.status(400).json({
                message: 'Advance must be a valid positive number.'
            });
        }

        if (parsedRoyalty !== null && (!Number.isInteger(parsedRoyalty) || parsedRoyalty < 0 || parsedRoyalty > 100)) {
            return res.status(400).json({
                message: 'Royalty must be a whole number between 0 and 100.'
            });
        }

        if (parsedYtdSales !== null && (!Number.isInteger(parsedYtdSales) || parsedYtdSales < 0)) {
            return res.status(400).json({
                message: 'Year-to-date sales must be a whole number greater than or equal to 0.'
            });
        }

        if (cleanNotes && cleanNotes.length > 200) {
            return res.status(400).json({
                message: 'Notes cannot be longer than 200 characters.'
            });
        }

        if (Number.isNaN(parsedPubDate.getTime())) {
            return res.status(400).json({
                message: 'Publication date is not valid.'
            });
        }

        const pool = await sql.connect(dbConfig);

        // check if title exists
        const titleCheck = await pool.request()
            .input('title_id', sql.VarChar(6), cleanTitleId)
            .query(`
                SELECT title_id
                FROM titles
                WHERE title_id = @title_id
            `);

        if (titleCheck.recordset.length === 0) {
            return res.status(404).json({
                message: 'Title not found.'
            });
        }

        // check duplicate title name but ignore current title
        const duplicateCheck = await pool.request()
            .input('title_id', sql.VarChar(6), cleanTitleId)
            .input('title', sql.VarChar(80), cleanTitle)
            .query(`
                SELECT title_id
                FROM titles
                WHERE LOWER(LTRIM(RTRIM(title))) = LOWER(LTRIM(RTRIM(@title)))
                AND title_id <> @title_id
            `);

        if (duplicateCheck.recordset.length > 0) {
            return res.status(409).json({
                message: 'Another title with this name already exists.'
            });
        }

        // check selected publisher exists
        const publisherCheck = await pool.request()
            .input('pub_id', sql.Char(4), cleanPubId)
            .query(`
                SELECT pub_id
                FROM publishers
                WHERE pub_id = @pub_id
            `);

        if (publisherCheck.recordset.length === 0) {
            return res.status(400).json({
                message: 'Selected publisher does not exist.'
            });
        }

        await pool.request()
            .input('title_id', sql.VarChar(6), cleanTitleId)
            .input('title', sql.VarChar(80), cleanTitle)
            .input('type', sql.Char(12), cleanType)
            .input('pub_id', sql.Char(4), cleanPubId)
            .input('price', sql.Money, parsedPrice)
            .input('advance', sql.Money, parsedAdvance)
            .input('royalty', sql.Int, parsedRoyalty)
            .input('ytd_sales', sql.Int, parsedYtdSales)
            .input('notes', sql.VarChar(200), cleanNotes)
            .input('pubdate', sql.DateTime, parsedPubDate)
            .query(`
                UPDATE titles
                SET
                    title = @title,
                    type = @type,
                    pub_id = @pub_id,
                    price = @price,
                    advance = @advance,
                    royalty = @royalty,
                    ytd_sales = @ytd_sales,
                    notes = @notes,
                    pubdate = @pubdate
                WHERE title_id = @title_id
            `);

        res.json({
            message: 'Title updated successfully.'
        });

    } catch (err) {
        console.error('Update title error:', err);

        res.status(500).json({
            message: 'Error updating title.',
            error: err.message
        });
    }
});



// DELETE TITLE
app.delete('/api/admin/titles/:title_id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const titleId = req.params.title_id;

        if (!titleId || titleId.trim().length !== 6) {
            return res.status(400).json({
                message: 'Valid title ID is required.'
            });
        }

        const cleanTitleId = titleId.trim().toUpperCase();

        const pool = await sql.connect(dbConfig);

        // check if title exists
        const titleCheck = await pool.request()
            .input('title_id', sql.VarChar(6), cleanTitleId)
            .query(`
                SELECT title_id, title
                FROM titles
                WHERE title_id = @title_id
            `);

        if (titleCheck.recordset.length === 0) {
            return res.status(404).json({
                message: 'Title not found.'
            });
        }

        // check if sales are using this title
        const salesCheck = await pool.request()
            .input('title_id', sql.VarChar(6), cleanTitleId)
            .query(`
                SELECT COUNT(*) AS salesCount
                FROM sales
                WHERE title_id = @title_id
            `);

        const salesCount = salesCheck.recordset[0].salesCount;

        if (salesCount > 0) {
            return res.status(400).json({
                message: `This title cannot be deleted because ${salesCount} sales record(s) are connected to it. Delete or reassign those sales first.`
            });
        }

        // check if title authors are using this title
        const titleAuthorCheck = await pool.request()
            .input('title_id', sql.VarChar(6), cleanTitleId)
            .query(`
                SELECT COUNT(*) AS titleAuthorCount
                FROM titleauthor
                WHERE title_id = @title_id
            `);

        const titleAuthorCount = titleAuthorCheck.recordset[0].titleAuthorCount;

        if (titleAuthorCount > 0) {
            return res.status(400).json({
                message: `This title cannot be deleted because ${titleAuthorCount} author assignment record(s) are connected to it. Delete or update those title author records first.`
            });
        }

        // check if royalty schedule is using this title
        const royaltyCheck = await pool.request()
            .input('title_id', sql.VarChar(6), cleanTitleId)
            .query(`
                SELECT COUNT(*) AS royaltyCount
                FROM roysched
                WHERE title_id = @title_id
            `);

        const royaltyCount = royaltyCheck.recordset[0].royaltyCount;

        if (royaltyCount > 0) {
            return res.status(400).json({
                message: `This title cannot be deleted because ${royaltyCount} royalty schedule record(s) are connected to it. Delete or update those royalty schedule records first.`
            });
        }

        await pool.request()
            .input('title_id', sql.VarChar(6), cleanTitleId)
            .query(`
                DELETE FROM titles
                WHERE title_id = @title_id
            `);

        res.json({
            message: 'Title deleted successfully.'
        });

    } catch (err) {
        console.error('Delete title error:', err);

        res.status(500).json({
            message: 'Error deleting title.',
            error: err.message
        });
    }
});








//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>SALES >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


// SALES MANAGEMENT ROUTES
// sales page is sensitive
// these routes are used for viewing, creating, editing, deleting, and reporting sales
// sales use a composite key in the Pubs database: stor_id + ord_num + title_id
// one order can have multiple title line items when stor_id + ord_num are the same



// GET SALES FOR SALES MANAGEMENT PAGE
// this returns individual sales rows
app.get('/api/sales', authenticateToken, requireSalesAccess, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT
                s.stor_id,
                s.ord_num,
                s.ord_date,
                s.qty,
                s.payterms,
                s.title_id,

                st.stor_name,
                st.city AS store_city,
                st.state AS store_state,

                t.title,
                t.type,
                t.price,
                t.pub_id,

                p.pub_name,

                CAST(ISNULL(t.price, 0) * ISNULL(s.qty, 0) AS money) AS estimated_revenue
            FROM sales s
            LEFT JOIN stores st ON s.stor_id = st.stor_id
            LEFT JOIN titles t ON s.title_id = t.title_id
            LEFT JOIN publishers p ON t.pub_id = p.pub_id
            ORDER BY s.ord_date DESC, s.ord_num, s.stor_id, s.title_id
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Get sales error:', err);

        res.status(500).json({
            message: 'Error getting sales.',
            error: err.message
        });
    }
});



// GET GROUPED SALES ORDERS
// this returns one row per order
// orders are grouped by stor_id + ord_num
app.get('/api/sales/orders', authenticateToken, requireSalesAccess, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT
                s.stor_id,
                s.ord_num,
                MIN(s.ord_date) AS ord_date,
                MAX(s.payterms) AS payterms,

                st.stor_name,
                st.city AS store_city,
                st.state AS store_state,

                COUNT(*) AS line_count,
                SUM(ISNULL(s.qty, 0)) AS total_qty,
                CAST(SUM(ISNULL(t.price, 0) * ISNULL(s.qty, 0)) AS money) AS order_total
            FROM sales s
            LEFT JOIN stores st ON s.stor_id = st.stor_id
            LEFT JOIN titles t ON s.title_id = t.title_id
            GROUP BY
                s.stor_id,
                s.ord_num,
                st.stor_name,
                st.city,
                st.state
            ORDER BY MIN(s.ord_date) DESC, s.ord_num
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Get grouped sales orders error:', err);

        res.status(500).json({
            message: 'Error getting grouped sales orders.',
            error: err.message
        });
    }
});



// GET FULL ORDER DETAILS
// this returns one order with all title line items
app.get('/api/sales/orders/:stor_id/:ord_num', authenticateToken, requireSalesAccess, async (req, res) => {
    try {
        const cleanStoreId = String(req.params.stor_id || '').trim();
        const cleanOrderNumber = String(req.params.ord_num || '').trim();

        if (!cleanStoreId || !cleanOrderNumber) {
            return res.status(400).json({
                message: 'Store ID and order number are required.'
            });
        }

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('stor_id', sql.Char(4), cleanStoreId)
            .input('ord_num', sql.VarChar(20), cleanOrderNumber)
            .query(`
                SELECT
                    s.stor_id,
                    s.ord_num,
                    s.ord_date,
                    s.qty,
                    s.payterms,
                    s.title_id,

                    st.stor_name,
                    st.city AS store_city,
                    st.state AS store_state,

                    t.title,
                    t.type,
                    t.price,
                    t.pub_id,

                    p.pub_name,

                    CAST(ISNULL(t.price, 0) * ISNULL(s.qty, 0) AS money) AS estimated_revenue
                FROM sales s
                LEFT JOIN stores st ON s.stor_id = st.stor_id
                LEFT JOIN titles t ON s.title_id = t.title_id
                LEFT JOIN publishers p ON t.pub_id = p.pub_id
                WHERE s.stor_id = @stor_id
                AND s.ord_num = @ord_num
                ORDER BY s.title_id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                message: 'Order not found.'
            });
        }

        const firstLine = result.recordset[0];

        const orderTotal = result.recordset.reduce((total, item) => {
            return total + Number(item.estimated_revenue || 0);
        }, 0);

        const totalQty = result.recordset.reduce((total, item) => {
            return total + Number(item.qty || 0);
        }, 0);

        res.json({
            stor_id: firstLine.stor_id,
            ord_num: firstLine.ord_num,
            ord_date: firstLine.ord_date,
            payterms: firstLine.payterms,

            stor_name: firstLine.stor_name,
            store_city: firstLine.store_city,
            store_state: firstLine.store_state,

            line_count: result.recordset.length,
            total_qty: totalQty,
            order_total: orderTotal,

            lines: result.recordset
        });

    } catch (err) {
        console.error('Get full sales order error:', err);

        res.status(500).json({
            message: 'Error getting full sales order.',
            error: err.message
        });
    }
});



// GET STORES FOR SALES FORM
app.get('/api/sales/stores', authenticateToken, requireSalesAccess, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT
                stor_id,
                stor_name,
                stor_address,
                city,
                state,
                zip
            FROM stores
            ORDER BY stor_name
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Get stores error:', err);

        res.status(500).json({
            message: 'Error getting stores.',
            error: err.message
        });
    }
});



// GET TITLES FOR SALES FORM
app.get('/api/sales/titles', authenticateToken, requireSalesAccess, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT
                t.title_id,
                t.title,
                t.type,
                t.pub_id,
                t.price,
                p.pub_name
            FROM titles t
            LEFT JOIN publishers p ON t.pub_id = p.pub_id
            ORDER BY t.title
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Get sales titles error:', err);

        res.status(500).json({
            message: 'Error getting titles.',
            error: err.message
        });
    }
});



// CREATE NEW SALE LINE
// this creates one title line inside an order
app.post('/api/sales', authenticateToken, requireSalesAccess, async (req, res) => {
    try {
        const {
            stor_id,
            ord_num,
            ord_date,
            qty,
            payterms,
            title_id
        } = req.body;

        if (!stor_id || !ord_num || !ord_date || qty === null || qty === undefined || !payterms || !title_id) {
            return res.status(400).json({
                message: 'Store, order number, order date, quantity, pay terms, and title are required.'
            });
        }

        const cleanStoreId = String(stor_id).trim();
        const cleanOrderNumber = String(ord_num).trim();
        const cleanPayTerms = String(payterms).trim();
        const cleanTitleId = String(title_id).trim().toUpperCase();

        const parsedOrderDate = new Date(ord_date);
        const parsedQty = Number(qty);

        if (cleanStoreId.length !== 4) {
            return res.status(400).json({
                message: 'Store ID must be exactly 4 characters.'
            });
        }

        if (!cleanOrderNumber || cleanOrderNumber.length > 20) {
            return res.status(400).json({
                message: 'Order number is required and cannot be longer than 20 characters.'
            });
        }

        if (Number.isNaN(parsedOrderDate.getTime())) {
            return res.status(400).json({
                message: 'Order date is not valid.'
            });
        }

        if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
            return res.status(400).json({
                message: 'Quantity must be a whole number greater than 0.'
            });
        }

        if (!cleanPayTerms || cleanPayTerms.length > 12) {
            return res.status(400).json({
                message: 'Pay terms are required and cannot be longer than 12 characters.'
            });
        }

        if (cleanTitleId.length !== 6) {
            return res.status(400).json({
                message: 'Title ID must be exactly 6 characters.'
            });
        }

        const pool = await sql.connect(dbConfig);

        const storeCheck = await pool.request()
            .input('stor_id', sql.Char(4), cleanStoreId)
            .query(`
                SELECT stor_id
                FROM stores
                WHERE stor_id = @stor_id
            `);

        if (storeCheck.recordset.length === 0) {
            return res.status(400).json({
                message: 'Selected store does not exist.'
            });
        }

        const titleCheck = await pool.request()
            .input('title_id', sql.VarChar(6), cleanTitleId)
            .query(`
                SELECT title_id
                FROM titles
                WHERE title_id = @title_id
            `);

        if (titleCheck.recordset.length === 0) {
            return res.status(400).json({
                message: 'Selected title does not exist.'
            });
        }

        const duplicateCheck = await pool.request()
            .input('stor_id', sql.Char(4), cleanStoreId)
            .input('ord_num', sql.VarChar(20), cleanOrderNumber)
            .input('title_id', sql.VarChar(6), cleanTitleId)
            .query(`
                SELECT
                    stor_id,
                    ord_num,
                    title_id
                FROM sales
                WHERE stor_id = @stor_id
                AND ord_num = @ord_num
                AND title_id = @title_id
            `);

        if (duplicateCheck.recordset.length > 0) {
            return res.status(409).json({
                message: 'This title already exists in this order. Use a different title or edit the existing line.'
            });
        }

        const result = await pool.request()
            .input('stor_id', sql.Char(4), cleanStoreId)
            .input('ord_num', sql.VarChar(20), cleanOrderNumber)
            .input('ord_date', sql.DateTime, parsedOrderDate)
            .input('qty', sql.SmallInt, parsedQty)
            .input('payterms', sql.VarChar(12), cleanPayTerms)
            .input('title_id', sql.VarChar(6), cleanTitleId)
            .query(`
                INSERT INTO sales
                    (
                        stor_id,
                        ord_num,
                        ord_date,
                        qty,
                        payterms,
                        title_id
                    )
                OUTPUT
                    INSERTED.stor_id,
                    INSERTED.ord_num,
                    INSERTED.ord_date,
                    INSERTED.qty,
                    INSERTED.payterms,
                    INSERTED.title_id
                VALUES
                    (
                        @stor_id,
                        @ord_num,
                        @ord_date,
                        @qty,
                        @payterms,
                        @title_id
                    )
            `);

        res.status(201).json({
            message: 'Sale line created successfully.',
            sale: result.recordset[0]
        });

    } catch (err) {
        console.error('Create sale line error:', err);

        res.status(500).json({
            message: 'Error creating sale line.',
            error: err.message
        });
    }
});



// CREATE FULL ORDER WITH MULTIPLE TITLE LINES
// expected body:
// {
//   stor_id: '7066',
//   ord_num: 'ORD9989',
//   ord_date: '2026-06-18',
//   payterms: 'Net 30',
//   items: [
//     { title_id: 'BU1032', qty: 3 },
//     { title_id: 'PC8888', qty: 2 }
//   ]
// }
app.post('/api/sales/orders', authenticateToken, requireSalesAccess, async (req, res) => {
    let transaction;

    try {
        const {
            stor_id,
            ord_num,
            ord_date,
            payterms,
            items
        } = req.body;

        if (!stor_id || !ord_num || !ord_date || !payterms || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: 'Store, order number, order date, pay terms, and at least one title line are required.'
            });
        }

        const cleanStoreId = String(stor_id).trim();
        const cleanOrderNumber = String(ord_num).trim();
        const cleanPayTerms = String(payterms).trim();
        const parsedOrderDate = new Date(ord_date);

        if (cleanStoreId.length !== 4) {
            return res.status(400).json({
                message: 'Store ID must be exactly 4 characters.'
            });
        }

        if (!cleanOrderNumber || cleanOrderNumber.length > 20) {
            return res.status(400).json({
                message: 'Order number is required and cannot be longer than 20 characters.'
            });
        }

        if (Number.isNaN(parsedOrderDate.getTime())) {
            return res.status(400).json({
                message: 'Order date is not valid.'
            });
        }

        if (!cleanPayTerms || cleanPayTerms.length > 12) {
            return res.status(400).json({
                message: 'Pay terms are required and cannot be longer than 12 characters.'
            });
        }

        const cleanItems = items.map((item) => {
            return {
                title_id: String(item.title_id || '').trim().toUpperCase(),
                qty: Number(item.qty)
            };
        });

        for (const item of cleanItems) {
            if (item.title_id.length !== 6) {
                return res.status(400).json({
                    message: 'Each title ID must be exactly 6 characters.'
                });
            }

            if (!Number.isInteger(item.qty) || item.qty <= 0) {
                return res.status(400).json({
                    message: 'Each quantity must be a whole number greater than 0.'
                });
            }
        }

        const duplicateTitleIds = cleanItems
            .map(item => item.title_id)
            .filter((titleId, index, array) => array.indexOf(titleId) !== index);

        if (duplicateTitleIds.length > 0) {
            return res.status(400).json({
                message: 'The same title cannot be added twice in the same order. Increase the quantity instead.'
            });
        }

        const pool = await sql.connect(dbConfig);

        const storeCheck = await pool.request()
            .input('stor_id', sql.Char(4), cleanStoreId)
            .query(`
                SELECT stor_id
                FROM stores
                WHERE stor_id = @stor_id
            `);

        if (storeCheck.recordset.length === 0) {
            return res.status(400).json({
                message: 'Selected store does not exist.'
            });
        }

        for (const item of cleanItems) {
            const titleCheck = await pool.request()
                .input('title_id', sql.VarChar(6), item.title_id)
                .query(`
                    SELECT title_id
                    FROM titles
                    WHERE title_id = @title_id
                `);

            if (titleCheck.recordset.length === 0) {
                return res.status(400).json({
                    message: `Selected title ${item.title_id} does not exist.`
                });
            }

            const duplicateCheck = await pool.request()
                .input('stor_id', sql.Char(4), cleanStoreId)
                .input('ord_num', sql.VarChar(20), cleanOrderNumber)
                .input('title_id', sql.VarChar(6), item.title_id)
                .query(`
                    SELECT
                        stor_id,
                        ord_num,
                        title_id
                    FROM sales
                    WHERE stor_id = @stor_id
                    AND ord_num = @ord_num
                    AND title_id = @title_id
                `);

            if (duplicateCheck.recordset.length > 0) {
                return res.status(409).json({
                    message: `Title ${item.title_id} already exists in this order.`
                });
            }
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const insertedLines = [];

        for (const item of cleanItems) {
            const insertRequest = new sql.Request(transaction);

            const insertResult = await insertRequest
                .input('stor_id', sql.Char(4), cleanStoreId)
                .input('ord_num', sql.VarChar(20), cleanOrderNumber)
                .input('ord_date', sql.DateTime, parsedOrderDate)
                .input('qty', sql.SmallInt, item.qty)
                .input('payterms', sql.VarChar(12), cleanPayTerms)
                .input('title_id', sql.VarChar(6), item.title_id)
                .query(`
                    INSERT INTO sales
                        (
                            stor_id,
                            ord_num,
                            ord_date,
                            qty,
                            payterms,
                            title_id
                        )
                    OUTPUT
                        INSERTED.stor_id,
                        INSERTED.ord_num,
                        INSERTED.ord_date,
                        INSERTED.qty,
                        INSERTED.payterms,
                        INSERTED.title_id
                    VALUES
                        (
                            @stor_id,
                            @ord_num,
                            @ord_date,
                            @qty,
                            @payterms,
                            @title_id
                        )
                `);

            insertedLines.push(insertResult.recordset[0]);
        }

        await transaction.commit();

        res.status(201).json({
            message: 'Sales order created successfully.',
            order: {
                stor_id: cleanStoreId,
                ord_num: cleanOrderNumber,
                ord_date: parsedOrderDate,
                payterms: cleanPayTerms,
                line_count: insertedLines.length,
                lines: insertedLines
            }
        });

    } catch (err) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackErr) {
                console.error('Create sales order rollback error:', rollbackErr);
            }
        }

        console.error('Create full sales order error:', err);

        res.status(500).json({
            message: 'Error creating sales order.',
            error: err.message
        });
    }
});



// UPDATE EXISTING SALE LINE
// stor_id, ord_num, and title_id stay as the original key
// user can update order date, quantity, and pay terms
app.put('/api/sales/:stor_id/:ord_num/:title_id', authenticateToken, requireSalesAccess, async (req, res) => {
    try {
        const originalStoreId = req.params.stor_id;
        const originalOrderNumber = req.params.ord_num;
        const originalTitleId = req.params.title_id;

        const {
            ord_date,
            qty,
            payterms
        } = req.body;

        if (!originalStoreId || !originalOrderNumber || !originalTitleId || !ord_date || qty === null || qty === undefined || !payterms) {
            return res.status(400).json({
                message: 'Original sale key, order date, quantity, and pay terms are required.'
            });
        }

        const cleanOriginalStoreId = String(originalStoreId).trim();
        const cleanOriginalOrderNumber = String(originalOrderNumber).trim();
        const cleanOriginalTitleId = String(originalTitleId).trim().toUpperCase();

        const cleanPayTerms = String(payterms).trim();

        const parsedOrderDate = new Date(ord_date);
        const parsedQty = Number(qty);

        if (cleanOriginalStoreId.length !== 4) {
            return res.status(400).json({
                message: 'Store ID must be exactly 4 characters.'
            });
        }

        if (!cleanOriginalOrderNumber || cleanOriginalOrderNumber.length > 20) {
            return res.status(400).json({
                message: 'Order number is required and cannot be longer than 20 characters.'
            });
        }

        if (cleanOriginalTitleId.length !== 6) {
            return res.status(400).json({
                message: 'Title ID must be exactly 6 characters.'
            });
        }

        if (Number.isNaN(parsedOrderDate.getTime())) {
            return res.status(400).json({
                message: 'Order date is not valid.'
            });
        }

        if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
            return res.status(400).json({
                message: 'Quantity must be a whole number greater than 0.'
            });
        }

        if (!cleanPayTerms || cleanPayTerms.length > 12) {
            return res.status(400).json({
                message: 'Pay terms are required and cannot be longer than 12 characters.'
            });
        }

        const pool = await sql.connect(dbConfig);

        const saleCheck = await pool.request()
            .input('stor_id', sql.Char(4), cleanOriginalStoreId)
            .input('ord_num', sql.VarChar(20), cleanOriginalOrderNumber)
            .input('title_id', sql.VarChar(6), cleanOriginalTitleId)
            .query(`
                SELECT
                    stor_id,
                    ord_num,
                    title_id
                FROM sales
                WHERE stor_id = @stor_id
                AND ord_num = @ord_num
                AND title_id = @title_id
            `);

        if (saleCheck.recordset.length === 0) {
            return res.status(404).json({
                message: 'Sale line not found.'
            });
        }

        await pool.request()
            .input('stor_id', sql.Char(4), cleanOriginalStoreId)
            .input('ord_num', sql.VarChar(20), cleanOriginalOrderNumber)
            .input('title_id', sql.VarChar(6), cleanOriginalTitleId)
            .input('ord_date', sql.DateTime, parsedOrderDate)
            .input('qty', sql.SmallInt, parsedQty)
            .input('payterms', sql.VarChar(12), cleanPayTerms)
            .query(`
                UPDATE sales
                SET
                    ord_date = @ord_date,
                    qty = @qty,
                    payterms = @payterms
                WHERE stor_id = @stor_id
                AND ord_num = @ord_num
                AND title_id = @title_id
            `);

        res.json({
            message: 'Sale line updated successfully.'
        });

    } catch (err) {
        console.error('Update sale line error:', err);

        res.status(500).json({
            message: 'Error updating sale line.',
            error: err.message
        });
    }
});




// DELETE FULL ORDER
// this deletes every title line inside the selected order
app.delete('/api/sales/orders/:stor_id/:ord_num', authenticateToken, requireSalesAccess, async (req, res) => {
    try {
        const cleanStoreId = String(req.params.stor_id || '').trim();
        const cleanOrderNumber = String(req.params.ord_num || '').trim();

        if (!cleanStoreId || !cleanOrderNumber) {
            return res.status(400).json({
                message: 'Store ID and order number are required.'
            });
        }

        const pool = await sql.connect(dbConfig);

        const orderCheck = await pool.request()
            .input('stor_id', sql.Char(4), cleanStoreId)
            .input('ord_num', sql.VarChar(20), cleanOrderNumber)
            .query(`
                SELECT
                    stor_id,
                    ord_num,
                    title_id
                FROM sales
                WHERE stor_id = @stor_id
                AND ord_num = @ord_num
            `);

        if (orderCheck.recordset.length === 0) {
            return res.status(404).json({
                message: 'Order not found.'
            });
        }

        await pool.request()
            .input('stor_id', sql.Char(4), cleanStoreId)
            .input('ord_num', sql.VarChar(20), cleanOrderNumber)
            .query(`
                DELETE FROM sales
                WHERE stor_id = @stor_id
                AND ord_num = @ord_num
            `);

        res.json({
            message: 'Sales order deleted successfully.'
        });

    } catch (err) {
        console.error('Delete full sales order error:', err);

        res.status(500).json({
            message: 'Error deleting sales order.',
            error: err.message
        });
    }
});






// DELETE SALE LINE
app.delete('/api/sales/:stor_id/:ord_num/:title_id', authenticateToken, requireSalesAccess, async (req, res) => {
    try {
        const originalStoreId = req.params.stor_id;
        const originalOrderNumber = req.params.ord_num;
        const originalTitleId = req.params.title_id;

        if (!originalStoreId || !originalOrderNumber || !originalTitleId) {
            return res.status(400).json({
                message: 'Original sale key is required.'
            });
        }

        const cleanOriginalStoreId = String(originalStoreId).trim();
        const cleanOriginalOrderNumber = String(originalOrderNumber).trim();
        const cleanOriginalTitleId = String(originalTitleId).trim().toUpperCase();

        const pool = await sql.connect(dbConfig);

        const saleCheck = await pool.request()
            .input('stor_id', sql.Char(4), cleanOriginalStoreId)
            .input('ord_num', sql.VarChar(20), cleanOriginalOrderNumber)
            .input('title_id', sql.VarChar(6), cleanOriginalTitleId)
            .query(`
                SELECT
                    stor_id,
                    ord_num,
                    title_id
                FROM sales
                WHERE stor_id = @stor_id
                AND ord_num = @ord_num
                AND title_id = @title_id
            `);

        if (saleCheck.recordset.length === 0) {
            return res.status(404).json({
                message: 'Sale line not found.'
            });
        }

        await pool.request()
            .input('stor_id', sql.Char(4), cleanOriginalStoreId)
            .input('ord_num', sql.VarChar(20), cleanOriginalOrderNumber)
            .input('title_id', sql.VarChar(6), cleanOriginalTitleId)
            .query(`
                DELETE FROM sales
                WHERE stor_id = @stor_id
                AND ord_num = @ord_num
                AND title_id = @title_id
            `);

        res.json({
            message: 'Sale line deleted successfully.'
        });

    } catch (err) {
        console.error('Delete sale line error:', err);

        res.status(500).json({
            message: 'Error deleting sale line.',
            error: err.message
        });
    }
});





// EMAIL SALE SUMMARY
// this uses the same email setup as your employee invite email
// supports both one sale line and a full order with multiple lines
app.post('/api/sales/email-summary', authenticateToken, requireSalesAccess, async (req, res) => {
    try {
        const {
            to,
            sale
        } = req.body;

        if (!to || !sale) {
            return res.status(400).json({
                message: 'Recipient email and sale summary are required.'
            });
        }

        const escapeHtml = (value) => {
            return String(value ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#039;');
        };

        const formatMoney = (value) => {
            return Number(value ?? 0).toFixed(2);
        };

        const formatCleanDate = (value) => {
            if (!value) {
                return 'N/A';
            }

            const rawValue = String(value);

            if (rawValue.includes('T')) {
                const dateOnly = rawValue.split('T')[0];
                const dateParts = dateOnly.split('-').map(Number);

                if (dateParts.length === 3) {
                    const cleanDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

                    return cleanDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                }
            }

            const dateValue = new Date(value);

            if (Number.isNaN(dateValue.getTime())) {
                return rawValue;
            }

            return dateValue.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        const lines = Array.isArray(sale.lines) && sale.lines.length > 0
            ? sale.lines
            : [sale];

        const totalQuantity = lines.reduce((total, line) => {
            return total + Number(line.qty || 0);
        }, 0);

        const orderTotal = lines.reduce((total, line) => {
            const quantity = Number(line.qty || 0);
            const unitPrice = Number(line.price || 0);
            const lineRevenue = Number(line.estimated_revenue ?? quantity * unitPrice);

            return total + lineRevenue;
        }, 0);

        const orderNumber = sale.ord_num || lines[0].ord_num;
        const orderDate = formatCleanDate(sale.ord_date || lines[0].ord_date);
        const paymentTerms = sale.payterms || lines[0].payterms;

        const storeId = sale.stor_id || lines[0].stor_id;
        const storeName = sale.stor_name || lines[0].stor_name || storeId;
        const storeCity = sale.store_city || lines[0].store_city || '';
        const storeState = sale.store_state || lines[0].store_state || '';
        const storeLocation = `${storeCity} ${storeState}`.trim() || 'N/A';

        const subject = `Sale Summary - Order ${orderNumber}`;

        const lineRows = lines.map((line) => {
            const quantity = Number(line.qty || 0);
            const unitPrice = Number(line.price || 0);
            const lineRevenue = Number(line.estimated_revenue ?? quantity * unitPrice);

            return `
                <tr>
                    <td style="border-bottom: 1px solid #d6d6d6; padding: 14px 10px;">
                        <strong>${escapeHtml(line.title || line.title_id)}</strong><br>
                        <span style="color: #666666; font-size: 12px;">${escapeHtml(line.pub_name || 'N/A')}</span>
                    </td>

                    <td style="border-bottom: 1px solid #d6d6d6; padding: 14px 10px;">
                        ${escapeHtml(line.title_id)}
                    </td>

                    <td style="border-bottom: 1px solid #d6d6d6; padding: 14px 10px;">
                        ${escapeHtml(line.type || 'N/A')}
                    </td>

                    <td style="border-bottom: 1px solid #d6d6d6; padding: 14px 10px; text-align: right;">
                        $${formatMoney(unitPrice)}
                    </td>

                    <td style="border-bottom: 1px solid #d6d6d6; padding: 14px 10px; text-align: right;">
                        ${quantity}
                    </td>

                    <td style="border-bottom: 1px solid #d6d6d6; padding: 14px 10px; text-align: right; color: #137333; font-weight: 800;">
                        $${formatMoney(lineRevenue)}
                    </td>
                </tr>
            `;
        }).join('');

        const html = `
            <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f3f5f7; padding: 24px; color: #1a1a1a;">
                <div style="max-width: 900px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d6d6d6;">

                    <div style="height: 10px; background: linear-gradient(90deg, #0066cc, #137333);"></div>

                    <div style="padding: 30px;">

                        <div style="display: table; width: 100%; border-bottom: 2px solid #1a1a1a; padding-bottom: 22px; margin-bottom: 24px;">
                            <div style="display: table-cell; width: 60%; vertical-align: top;">
                                <h1 style="margin: 0; font-size: 28px; color: #1a1a1a;">
                                    Pubs Sales Management
                                </h1>

                                <p style="margin: 6px 0 0 0; color: #555555; font-size: 13px; line-height: 1.5;">
                                    Professional Sales Order Summary<br>
                                    Generated from the protected sales reporting area
                                </p>
                            </div>

                            <div style="display: table-cell; width: 40%; vertical-align: top;">
                                <div style="border: 1px solid #d6d6d6; background-color: #fafafa; padding: 14px;">
                                    <div style="font-size: 11px; text-transform: uppercase; color: #555555; font-weight: 700;">
                                        Sales Order Summary
                                    </div>

                                    <div style="font-size: 22px; font-weight: 800; color: #0066cc; margin-top: 4px;">
                                        ${escapeHtml(orderNumber)}
                                    </div>

                                    <div style="margin-top: 12px; font-size: 12px; color: #333333; line-height: 1.7;">
                                        <div><strong>Order Date:</strong> ${escapeHtml(orderDate)}</div>
                                        <div><strong>Store ID:</strong> ${escapeHtml(storeId)}</div>
                                        <div><strong>Line Items:</strong> ${lines.length}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style="display: table; width: 100%; margin-bottom: 24px;">
                            <div style="display: table-cell; width: 33%; padding-right: 10px;">
                                <div style="border: 1px solid #d6d6d6; border-left: 5px solid #1a1a1a; padding: 14px;">
                                    <div style="font-size: 11px; text-transform: uppercase; color: #555555; font-weight: 700;">
                                        Payment Terms
                                    </div>
                                    <div style="font-size: 18px; font-weight: 800; margin-top: 6px;">
                                        ${escapeHtml(paymentTerms)}
                                    </div>
                                </div>
                            </div>

                            <div style="display: table-cell; width: 33%; padding-right: 10px;">
                                <div style="border: 1px solid #d6d6d6; border-left: 5px solid #0066cc; padding: 14px;">
                                    <div style="font-size: 11px; text-transform: uppercase; color: #555555; font-weight: 700;">
                                        Total Quantity
                                    </div>
                                    <div style="font-size: 18px; font-weight: 800; margin-top: 6px;">
                                        ${totalQuantity}
                                    </div>
                                </div>
                            </div>

                            <div style="display: table-cell; width: 34%;">
                                <div style="border: 1px solid #d6d6d6; border-left: 5px solid #137333; background-color: #f3fbf6; padding: 14px;">
                                    <div style="font-size: 11px; text-transform: uppercase; color: #555555; font-weight: 700;">
                                        Order Revenue
                                    </div>
                                    <div style="font-size: 18px; font-weight: 800; color: #137333; margin-top: 6px;">
                                        $${formatMoney(orderTotal)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h2 style="font-size: 15px; text-transform: uppercase; border-bottom: 1px solid #d6d6d6; padding-bottom: 8px; margin: 28px 0 12px 0;">
                            Customer / Store Information
                        </h2>

                        <div style="border: 1px solid #d6d6d6; padding: 14px; margin-bottom: 24px;">
                            <p style="margin: 6px 0;"><strong>Store:</strong> ${escapeHtml(storeName)}</p>
                            <p style="margin: 6px 0;"><strong>Store ID:</strong> ${escapeHtml(storeId)}</p>
                            <p style="margin: 6px 0;"><strong>Location:</strong> ${escapeHtml(storeLocation)}</p>
                        </div>

                        <h2 style="font-size: 15px; text-transform: uppercase; border-bottom: 1px solid #d6d6d6; padding-bottom: 8px; margin: 28px 0 12px 0;">
                            Order Line Items
                        </h2>

                        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
                            <thead>
                                <tr>
                                    <th style="background-color: #1a1a1a; color: #ffffff; padding: 12px 10px; text-align: left; font-size: 12px;">Title</th>
                                    <th style="background-color: #1a1a1a; color: #ffffff; padding: 12px 10px; text-align: left; font-size: 12px;">Title ID</th>
                                    <th style="background-color: #1a1a1a; color: #ffffff; padding: 12px 10px; text-align: left; font-size: 12px;">Type</th>
                                    <th style="background-color: #1a1a1a; color: #ffffff; padding: 12px 10px; text-align: right; font-size: 12px;">Unit Price</th>
                                    <th style="background-color: #1a1a1a; color: #ffffff; padding: 12px 10px; text-align: right; font-size: 12px;">Qty</th>
                                    <th style="background-color: #1a1a1a; color: #ffffff; padding: 12px 10px; text-align: right; font-size: 12px;">Revenue</th>
                                </tr>
                            </thead>

                            <tbody>
                                ${lineRows}
                            </tbody>
                        </table>

                        <div style="margin-top: 24px; text-align: right;">
                            <div style="display: inline-block; width: 360px; border: 2px solid #137333; background-color: #f3fbf6; text-align: left;">

                                <div style="display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #c7e8d1;">
                                    <span>Subtotal</span>
                                    <strong>$${formatMoney(orderTotal)}</strong>
                                </div>

                                <div style="display: flex; justify-content: space-between; padding: 14px 16px; background-color: #137333; color: #ffffff; font-size: 18px; font-weight: 800;">
                                    <span>Total Order Revenue</span>
                                    <strong>$${formatMoney(orderTotal)}</strong>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 28px; border: 1px solid #d6d6d6; padding: 14px; background-color: #fafafa; font-size: 12px; color: #444444; line-height: 1.6;">
                            <strong>Report Notes:</strong>
                            This document is generated for internal business reporting purposes.
                            Revenue is calculated using each title price multiplied by quantity sold.
                            Final accounting totals may differ if discounts, refunds, or other adjustments apply.
                        </div>

                        <div style="margin-top: 28px; padding-top: 14px; border-top: 1px solid #d6d6d6; font-size: 11px; color: #666666;">
                            <strong style="color: #a50e0e;">Confidential Sales Information</strong>
                            <br>
                            Pubs Sales Management • Sales Order Summary
                        </div>

                    </div>
                </div>
            </div>
        `;

        const salesTransporter = nodemailer.createTransport({
            service: process.env.SMTP_SERVICE,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        await salesTransporter.sendMail({
            from: process.env.SMTP_FROM,
            to,
            subject,
            html
        });

        res.json({
            message: 'Sale summary email sent successfully.'
        });

    } catch (err) {
        console.error('Email sale summary error:', err);

        res.status(500).json({
            message: 'Error sending sale summary email.',
            error: err.message
        });
    }
});










// GET TITLES FOR SALES FORM
app.get('/api/sales/titles', authenticateToken, requireSalesAccess, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT
                t.title_id,
                t.title,
                t.type,
                t.pub_id,
                t.price,

                p.pub_name
            FROM titles t
            LEFT JOIN publishers p ON t.pub_id = p.pub_id
            ORDER BY t.title
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Get sales titles error:', err);

        res.status(500).json({
            message: 'Error getting titles for sales form.',
            error: err.message
        });
    }
});







/*
    DATABASE CONNECTION NOTES

    first I tried connecting to SQL Server using the regular dbConfig object

    const dbConfig = {
        server: 'OPS-PF5FMHCC\\SQLEXPRESS',
        database: 'pubs',
        driver: 'msnodesqlv8',
        options: {
            trustedConnection: true,
            trustServerCertificate: true
        }
    };

    double backslash \\ is important because in JS a single backslash \ is a special escape character
    SQL Server instance is called OPS-PF5FMHCC\SQLEXPRESS JS needs it written as
    OPS-PF5FMHCC\\SQLEXPRESS

    this version gave an ODBC driver error:

    [Microsoft][ODBC Driver Manager] Data source name not found and no default driver specified

    That error means Node could reach the mssql/msnodesqlv8 package, but Windows could not find/use the SQL Server driver properly from the object configuration.

    to fix it I used a full ODBC connection string instead
    connection string directly tells Node which ODBC driver to use which SQL Server instance to connect to
    which database to use, and that Windows Authentication should be used.

    My SSMS connection uses:
    Server: OPS-PF5FMHCC\SQLEXPRESS
    Authentication: Windows Authentication
    Database: pubs
    Trust Server Certificate: checked

    Because of that, the working connection string uses:
    Driver={ODBC Driver 17 for SQL Server}
    Server=OPS-PF5FMHCC\\SQLEXPRESS
    Database=pubs
    Trusted_Connection=yes
    TrustServerCertificate=yes

    This allows Node.js to connect to the same SQL Server database that I use in SSMS.
*/




//const dbConfig = {
//    // that double // is pretty important sice JS ONE / is a special carater so we write
 //   server: 'OPS-PF5FMHCC\\SQLEXPRESS',
 //   database: 'pubs',
//    driver: 'msnodesqlv8',
//    options: {
//        trustedConnection: true,
       // trustServerCertificate: true
 //   }
//};



const dbConfig = {
    connectionString:
        'Driver={ODBC Driver 17 for SQL Server};Server=OPS-PF5FMHCC\\SQLEXPRESS;Database=pubs;Trusted_Connection=yes;TrustServerCertificate=yes;'
};




        // AUTH MIDDLEWARE
        // this allows us to pretect token routes
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            message: 'Access denied. No token provided.'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                message: 'Invalid or expired token.'
            });
        }

        req.user = user;
        next();
    });
}








// GET CURRENT LOGGED-IN USER FROM TOKEN
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('user_id', sql.Int, req.user.user_id)
            .query(`
                SELECT
                    u.user_id,
                    u.emp_id,
                    u.email,
                    u.is_admin,
                    u.is_active,

                    e.fname,
                    e.minit,
                    e.lname,
                    e.job_id,
                    e.job_lvl,
                    e.pub_id,
                    e.hire_date,

                    j.job_desc
                FROM app_users u
                INNER JOIN employee e ON u.emp_id = e.emp_id
                INNER JOIN jobs j ON e.job_id = j.job_id
                WHERE u.user_id = @user_id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                message: 'User not found.'
            });
        }

        res.json(result.recordset[0]);

    } catch (err) {
        console.error('Get current user error:', err);

        res.status(500).json({
            message: 'Error getting current user.',
            error: err.message
        });
    }
});




















// simple test route.
// this confirms that the API server is running
app.get('/', (req, res) => {
    res.send('Authors API is running');
});


//GET ALL AUTHROS, thsi will return all authros from db 
app.get('/api/authors', async (req, res) => {
    try {
        // status comes from the URL query string
        
        const status = req.query.status || 'active';

        // default is active authors only
        let whereClause = 'WHERE is_active = 1';

        // archived means is_active = 0
        if (status === 'archived') {
            whereClause = 'WHERE is_active = 0';
        }

        // all means no WHERE filter
        if (status === 'all') {
            whereClause = '';
        }

        //open conection to sql server using dbConfig setting 
        const pool = await sql.connect(dbConfig);

        //runing the sql against our tabel
        const result = await pool.request().query(`
            SELECT
                au_id,
                au_lname,
                au_fname,
                phone,
                address,
                city,
                state,
                zip,
                contract,
                is_active
            FROM authors
            ${whereClause}
            ORDER BY au_lname, au_fname
        `);

        //sending the query result back to the browser as JSON
        res.json(result.recordset);
    } catch (err) {   // if something goes wrong we catch the error and send back a 500 status code with the error message
        console.error('Database error:', err);
        res.status(500).json({
            message: 'Error getting authors',
            error: err.message
        });
    }
});





//GET one author by ID
app.get('/api/authors/:id', async (req, res) => {
    try {
        // get the author ID from the URL
        const authorId = req.params.id;

        //conection
        const pool = await sql.connect(dbConfig);

        // safer than directly putting the ID into the SQL string
        const result = await pool.request()
            .input('au_id', sql.VarChar(11), authorId)
            .query(`
                SELECT
                    au_id,
                    au_lname,
                    au_fname,
                    phone,
                    address,
                    city,
                    state,
                    zip,
                    contract,
                    is_active
                FROM authors
                WHERE au_id = @au_id
            `);

        // no author was found
        if (result.recordset.length === 0) {
            return res.status(404).json({
                message: 'Author not found'
            });
        }

        //return the first matching author
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Database error:', err);

        res.status(500).json({
            message: 'Error getting author',
            error: err.message
        });
    }
});



// POST create new author
// route receives author data from the frontend-Postman
// and inserts a new row into the authors table.
app.post('/api/authors', async (req, res) => {
    try {
        //get the data sent in the request body
        const {
            au_id,
            au_lname,
            au_fname,
            phone,
            address,
            city,
            state,
            zip,
            contract
        } = req.body;

        //connect to SQL Server
        const pool = await sql.connect(dbConfig);

               // Check if another author already has the same Author ID or phone number.
// This prevents saving duplicate author records.
                                                const duplicateCheck = await pool.request()
                                                    .input('au_id', sql.VarChar(11), au_id)
                                                    .input('phone', sql.Char(12), phone)
                                                    .query(`
                                                        SELECT au_id, phone
                                                        FROM authors
                                                        WHERE au_id = @au_id OR phone = @phone
                                                    `);

                                                const duplicateErrors = [];

                                                for (const record of duplicateCheck.recordset) {
                                                    if (record.au_id === au_id) {
                                                        duplicateErrors.push('Author ID already exists. Please use a different Author ID.');
                                                    }

                                                    if (record.phone.trim() === phone.trim()) {
                                                        duplicateErrors.push('Phone number already exists. Please use a different phone number.');
                                                    }
                                                }

                                                // remove duplicate messages if same message was added more than once
                                                const uniqueDuplicateErrors = [...new Set(duplicateErrors)];

                                                if (uniqueDuplicateErrors.length > 0) {
                                                    return res.status(409).json({
                                                        message: 'Duplicate author record found.',
                                                        errors: uniqueDuplicateErrors
                                                    });
                                                }
        //insert the new author using parameters.
        //parameters are safer than directly placing values inside the SQL string
        await pool.request()
            .input('au_id', sql.VarChar(11), au_id)
            .input('au_lname', sql.VarChar(40), au_lname)
            .input('au_fname', sql.VarChar(20), au_fname)
            .input('phone', sql.Char(12), phone)
            .input('address', sql.VarChar(40), address)
            .input('city', sql.VarChar(20), city)
            .input('state', sql.Char(2), state)
            .input('zip', sql.Char(5), zip)
            .input('contract', sql.Bit, contract)
            .query(`
                INSERT INTO authors (
                    au_id,
                    au_lname,
                    au_fname,
                    phone,
                    address,
                    city,
                    state,
                    zip,
                    contract
                )
                VALUES (
                    @au_id,
                    @au_lname,
                    @au_fname,
                    @phone,
                    @address,
                    @city,
                    @state,
                    @zip,
                    @contract
                )
            `);

        //send success response
        res.status(201).json({
            message: 'Author created successfully'
        });
    } catch (err) {
        console.error('Database error:', err);

        res.status(500).json({
            message: 'Error creating author',
            error: err.message
        });
    }
});





//PUT update an existing author
app.put('/api/authors/:id', async (req, res) => {
    try {
        const authorId = req.params.id;

        const {
            au_lname,
            au_fname,
            phone,
            address,
            city,
            state,
            zip,
            contract
        } = req.body;

        const pool = await sql.connect(dbConfig);

                                // Check if another author already has the same phone number.
                        // This prevents duplicate phone numbers when editing an author.
                        const duplicateCheck = await pool.request()
                            .input('au_id', sql.VarChar(11), authorId)
                            .input('phone', sql.Char(12), phone)
                            .query(`
                                SELECT au_id, phone
                                FROM authors
                                WHERE phone = @phone
                                AND au_id <> @au_id
                            `);

                        if (duplicateCheck.recordset.length > 0) {
                            return res.status(409).json({
                                message: 'Duplicate author record found.',
                                errors: [
                                    'Phone number already exists. Please use a different phone number.'
                                ]
                            });
                        }


        const result = await pool.request()
            .input('au_id', sql.VarChar(11), authorId)
            .input('au_lname', sql.VarChar(40), au_lname)
            .input('au_fname', sql.VarChar(20), au_fname)
            .input('phone', sql.Char(12), phone)
            .input('address', sql.VarChar(40), address)
            .input('city', sql.VarChar(20), city)
            .input('state', sql.Char(2), state)
            .input('zip', sql.Char(5), zip)
            .input('contract', sql.Bit, contract)
            .query(`
                UPDATE authors
                SET
                    au_lname = @au_lname,
                    au_fname = @au_fname,
                    phone = @phone,
                    address = @address,
                    city = @city,
                    state = @state,
                    zip = @zip,
                    contract = @contract
                WHERE au_id = @au_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                message: 'Author not found'
            });
        }

        res.json({
            message: 'Author updated successfully'
        });
    } catch (err) {
        console.error('Database error:', err);

        res.status(500).json({
            message: 'Error updating author',
            error: err.message
        });
    }
});






// UPDATE AUTHOR ACTIVE STATUS
// this is used by the Active / Inactive slide toggle on the Authors page
app.put('/api/authors/:id/status', async (req, res) => {
    try {
        const authorId = req.params.id;

        const {
            is_active
        } = req.body;

        if (is_active === null || is_active === undefined) {
            return res.status(400).json({
                message: 'Author active status is required.'
            });
        }

        const requestedStatus = is_active === true || is_active === 1;

        const pool = await sql.connect(dbConfig);

        const authorCheck = await pool.request()
            .input('au_id', sql.VarChar(11), authorId)
            .query(`
                SELECT
                    au_id,
                    au_fname,
                    au_lname,
                    is_active
                FROM authors
                WHERE au_id = @au_id
            `);

        if (authorCheck.recordset.length === 0) {
            return res.status(404).json({
                message: 'Author not found.'
            });
        }

        await pool.request()
            .input('au_id', sql.VarChar(11), authorId)
            .input('is_active', sql.Bit, requestedStatus ? 1 : 0)
            .query(`
                UPDATE authors
                SET is_active = @is_active
                WHERE au_id = @au_id
            `);

        res.json({
            message: requestedStatus
                ? 'Author marked as active successfully.'
                : 'Author marked as inactive successfully.'
        });

    } catch (err) {
        console.error('Update author status error:', err);

        res.status(500).json({
            message: 'Error updating author status.',
            error: err.message
        });
    }
});



// DELETE AUTHOR
// this permanently deletes an author only if the author is not connected to any title records
app.delete('/api/authors/:id', async (req, res) => {
    try {
        const authorId = req.params.id;

        const pool = await sql.connect(dbConfig);

        const authorCheck = await pool.request()
            .input('au_id', sql.VarChar(11), authorId)
            .query(`
                SELECT
                    au_id,
                    au_fname,
                    au_lname
                FROM authors
                WHERE au_id = @au_id
            `);

        if (authorCheck.recordset.length === 0) {
            return res.status(404).json({
                message: 'Author not found.'
            });
        }

        const titleAuthorCheck = await pool.request()
            .input('au_id', sql.VarChar(11), authorId)
            .query(`
                SELECT COUNT(*) AS titleAuthorCount
                FROM titleauthor
                WHERE au_id = @au_id
            `);

        const titleAuthorCount = titleAuthorCheck.recordset[0].titleAuthorCount;

        if (titleAuthorCount > 0) {
            return res.status(400).json({
                message: `This author cannot be deleted because ${titleAuthorCount} title assignment record(s) are connected to this author. Remove those title-author assignments first.`
            });
        }

        await pool.request()
            .input('au_id', sql.VarChar(11), authorId)
            .query(`
                DELETE FROM authors
                WHERE au_id = @au_id
            `);

        res.json({
            message: 'Author deleted successfully.'
        });

    } catch (err) {
        console.error('Delete author error:', err);

        res.status(500).json({
            message: 'Error deleting author.',
            error: err.message
        });
    }
});




// AUTHENTICATION PART 

// create admin account
app.post('/api/setup/create-admin', async (req, res) => {
    try {
        const {
            emp_id,
            email,
            password
        } = req.body;

        if (!emp_id || !email || !password) {
            return res.status(400).json({
                message: 'Employee ID, email, and password are required.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters.'
            });
        }

        const pool = await sql.connect(dbConfig);

        const employeeCheck = await pool.request()
            .input('emp_id', sql.Char(9), emp_id)
            .query(`
                SELECT emp_id, fname, lname, job_id
                FROM employee
                WHERE emp_id = @emp_id
            `);

        if (employeeCheck.recordset.length === 0) {
            return res.status(404).json({
                message: 'Employee ID does not exist in employee table.'
            });
        }

        const existingUser = await pool.request()
            .input('emp_id', sql.Char(9), emp_id)
            .input('email', sql.VarChar(255), email)
            .query(`
                SELECT user_id, emp_id, email
                FROM app_users
                WHERE emp_id = @emp_id OR email = @email
            `);

        if (existingUser.recordset.length > 0) {
            return res.status(409).json({
                message: 'Admin account already exists for this employee or email.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await pool.request()
            .input('emp_id', sql.Char(9), emp_id)
            .input('email', sql.VarChar(255), email)
            .input('password_hash', sql.VarChar(255), passwordHash)
            .query(`
                INSERT INTO app_users
                    (
                        emp_id,
                        email,
                        password_hash,
                        email_confirmed,
                        confirmation_token,
                        is_admin,
                        is_active,
                        invite_token,
                        invite_sent_at,
                        password_set
                    )
                VALUES
                    (
                        @emp_id,
                        @email,
                        @password_hash,
                        1,
                        NULL,
                        1,
                        1,
                        NULL,
                        NULL,
                        1
                    )
            `);

        res.status(201).json({
            message: 'First admin account created successfully.'
        });
    } catch (err) {
        console.error('Create admin error:', err);

        res.status(500).json({
            message: 'Error creating admin account.',
            error: err.message
        });
    }
});





// LOGIN ROUTE
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required.'
            });
        }

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('email', sql.VarChar(255), email)
            .query(`
                SELECT
                    u.user_id,
                    u.emp_id,
                    u.email,
                    u.password_hash,
                    u.email_confirmed,
                    u.is_admin,
                    u.is_active,
                    u.password_set,

                    e.fname,
                    e.minit,
                    e.lname,
                    e.job_id,
                    e.job_lvl,
                    e.pub_id,
                    e.hire_date,

                    j.job_desc
                FROM app_users u
                INNER JOIN employee e ON u.emp_id = e.emp_id
                INNER JOIN jobs j ON e.job_id = j.job_id
                WHERE u.email = @email
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({
                message: 'Invalid email or password.'
            });
        }

        const user = result.recordset[0];

        if (!user.is_active) {
            return res.status(403).json({
                message: 'This account is disabled.'
            });
        }

        if (!user.email_confirmed) {
            return res.status(403).json({
                message: 'Please confirm your email before logging in.'
            });
        }

        if (!user.password_set) {
            return res.status(403).json({
                message: 'Password has not been created yet.'
            });
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatches) {
            return res.status(401).json({
                message: 'Invalid email or password.'
            });
        }

        const tokenPayload = {
            user_id: user.user_id,
            emp_id: user.emp_id,
            email: user.email,
            is_admin: user.is_admin,
            job_id: user.job_id,
            job_desc: user.job_desc
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.json({
            message: 'Login successful.',
            token,
            user: {
                user_id: user.user_id,
                emp_id: user.emp_id,
                email: user.email,
                is_admin: user.is_admin,

                fname: user.fname,
                minit: user.minit,
                lname: user.lname,

                job_id: user.job_id,
                job_desc: user.job_desc,
                job_lvl: user.job_lvl,
                pub_id: user.pub_id,
                hire_date: user.hire_date
            }
        });

    } catch (err) {
        console.error('Login error:', err);

        res.status(500).json({
            message: 'Error logging in.',
            error: err.message
        });
    }
});





// ADMIN ENABLE LOGIN ACCOUNT FOR EXISTING EMPLOYEE
// this is used when employee already exists but does not have app login yet
// admin enters email, system creates app_users record and sends invite email
app.post('/api/admin/employees/:emp_id/enable-account', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const empId = req.params.emp_id;

        const {
            email
        } = req.body;

        if (!empId || !email) {
            return res.status(400).json({
                message: 'Employee ID and email are required.'
            });
        }

        const cleanEmpId = String(empId).trim();
        const cleanEmail = String(email).trim().toLowerCase();

        if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                message: 'A valid email address is required.'
            });
        }

        const pool = await sql.connect(dbConfig);

        // check if employee exists
        const employeeCheck = await pool.request()
            .input('emp_id', sql.Char(9), cleanEmpId)
            .query(`
                SELECT
                    emp_id,
                    fname,
                    minit,
                    lname
                FROM employee
                WHERE emp_id = @emp_id
            `);

        if (employeeCheck.recordset.length === 0) {
            return res.status(404).json({
                message: 'Employee was not found.'
            });
        }

        const employee = employeeCheck.recordset[0];

        // check if this employee already has login account
        const existingEmployeeAccountCheck = await pool.request()
            .input('emp_id', sql.Char(9), cleanEmpId)
            .query(`
                SELECT
                    user_id,
                    email
                FROM app_users
                WHERE emp_id = @emp_id
            `);

        if (existingEmployeeAccountCheck.recordset.length > 0) {
            return res.status(409).json({
                message: 'This employee already has a login account.'
            });
        }

        // check if email is already used by another account
        const emailCheck = await pool.request()
            .input('email', sql.VarChar(255), cleanEmail)
            .query(`
                SELECT
                    user_id,
                    email
                FROM app_users
                WHERE LOWER(email) = LOWER(@email)
            `);

        if (emailCheck.recordset.length > 0) {
            return res.status(409).json({
                message: 'This email already has an account.'
            });
        }

        const inviteToken = crypto.randomBytes(32).toString('hex');

        const employeeName = `${employee.fname} ${employee.lname}`;
        const inviteLink = `${process.env.FRONTEND_URL}/register-invite?token=${inviteToken}`;

        // create app login account for existing employee
        await pool.request()
            .input('emp_id', sql.Char(9), cleanEmpId)
            .input('email', sql.VarChar(255), cleanEmail)
            .input('invite_token', sql.VarChar(255), inviteToken)
            .query(`
                INSERT INTO app_users
                    (
                        emp_id,
                        email,
                        password_hash,
                        email_confirmed,
                        confirmation_token,
                        is_admin,
                        is_active,
                        invite_token,
                        invite_sent_at,
                        password_set
                    )
                VALUES
                    (
                        @emp_id,
                        @email,
                        NULL,
                        0,
                        NULL,
                        0,
                        1,
                        @invite_token,
                        GETDATE(),
                        0
                    )
            `);

        console.log('Sending enable account invite to:', cleanEmail);
        console.log('Invite link created:', inviteLink);

        const emailDebug = await sendInviteEmail(cleanEmail, employeeName, inviteLink);

        res.status(201).json({
            message: `Login account invite sent to ${cleanEmail}.`,
            inviteLink: inviteLink,
            emailDebug: emailDebug
        });

    } catch (err) {
        console.error('Enable employee account error:', err);

        res.status(500).json({
            message: 'Error enabling employee login account.',
            error: err.message
        });
    }
});











// defining the port number for conection
const PORT = 3000;


// starting the server and listening on the defined port, will record changes auto 
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});











