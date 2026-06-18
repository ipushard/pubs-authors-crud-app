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












// GET JOBS FOR ADMIN EMPLOYEE FORM helper
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









// GET PUBLISHERS FOR ADMIN EMPLOYEE FORM
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






// SOFT DELETE / DEACTIVATE an author by ID
// This does not physically delete the author.
// It only marks the author as inactive.
app.delete('/api/authors/:id', async (req, res) => {
    try {
        const authorId = req.params.id;

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('au_id', sql.VarChar(11), authorId)
            .query(`
                UPDATE authors
                SET is_active = 0
                WHERE au_id = @au_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                message: 'Author not found.'
            });
        }

        res.json({
            message: 'Author deactivated successfully.'
        });
    } catch (err) {
        console.error('Database error deactivating author:', err);

        res.status(500).json({
            message: 'Error deactivating author.',
            error: err.message
        });
    }
});




// UNARCHIVE an author by ID
// This marks archived author as active again.
app.put('/api/authors/:id/unarchive', async (req, res) => {
    try {
        const authorId = req.params.id;

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('au_id', sql.VarChar(11), authorId)
            .query(`
                UPDATE authors
                SET is_active = 1
                WHERE au_id = @au_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                message: 'Author not found.'
            });
        }

        res.json({
            message: 'Author unarchived successfully.'
        });
    } catch (err) {
        console.error('Database error unarchiving author:', err);

        res.status(500).json({
            message: 'Error unarchiving author.',
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











// defining the port number for conection
const PORT = 3000;


// starting the server and listening on the defined port, will record changes auto 
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});











