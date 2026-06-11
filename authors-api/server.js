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




// simple test route.
// this confirms that the API server is running.
app.get('/', (req, res) => {
    res.send('Authors API is running');
});


//GET ALL AUTHROS, thsi will return all authros from db 
app.get('/api/authors', async (req, res) => {
    try {
        // status comes from the URL query string
        // example:
        // /api/authors?status=active
        // /api/authors?status=archived
        // /api/authors?status=all
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





// GET one author by ID
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





// PUT update an existing author
// Example URL: http://localhost:3000/api/authors/111-22-3333
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









// defining the port number for conection
const PORT = 3000;


// starting the server and listening on the defined port, will record changes auto 
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});