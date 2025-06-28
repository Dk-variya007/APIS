//for start npm start or nodemon app.js
//exit ctrl+c


// const http = require('http');

// const server = http.createServer((req, res) => {
//     if (req.url == "/") {
//         res.write("You are in Home");
//         res.end();
//     } else if (req.url == "/another") {
//         res.write("you are in Another page");
//         res.end();
//     } else {
//         res.write("I am Listning");
//         res.end();
//     }

// })
// const port = 3000;//localhost:3000
// server.listen(port, () => {
//     console.log("Server is running on port", port);
// })
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://DevWithDK:5x7onkxJTbh1fnnz@cluster0.7ruv9ri.mongodb.net/Employee_DB?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Employee Schema
const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    position: {
        type: String,
        required: true
    }
});

const Employee = mongoose.model('Employee', employeeSchema);

// ✅ CREATE Employee
app.post('/employees', async (req, res) => {
    try {
        const employee = new Employee(req.body);
        await employee.save();
        res.status(201).json({
            message: '✅ Employee created successfully',
            data: employee
        });
    } catch (error) {
        res.status(400).json({ message: '❌ Error creating employee', error: error.message });
    }
});

// ✅ READ All Employees
app.get('/employees', async (req, res) => {
    try {
        const employees = await Employee.find();
        res.json({
            message: '✅ Employees fetched successfully',
            data: employees
        });
    } catch (error) {
        res.status(500).json({ message: '❌ Error fetching employees', error: error.message });
    }
});

// ✅ UPDATE Employee
app.put('/employees/:id', async (req, res) => {
    try {
        const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!employee) return res.status(404).json({ message: '❌ Employee not found' });

        res.json({
            message: '✅ Employee updated successfully',
            data: employee
        });
    } catch (error) {
        res.status(400).json({ message: '❌ Error updating employee', error: error.message });
    }
});

// ✅ DELETE Employee
app.delete('/employees/:id', async (req, res) => {
    try {
        const employee = await Employee.findByIdAndDelete(req.params.id);
        if (!employee) return res.status(404).json({ message: '❌ Employee not found' });

        res.json({
            message: '✅ Employee deleted successfully',
            data: employee
        });
    } catch (error) {
        res.status(400).json({ message: '❌ Error deleting employee', error: error.message });
    }
});

// ✅ Default route
app.get('/', (req, res) => {
    res.send('🎉 Welcome to the Employee API');
});

// ✅ Start Server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
