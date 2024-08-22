const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const ASANA_ACCESS_TOKEN = '2/1208103241103229/1208103794237447:e084e90d37786fa8f5b6725a1434b745'; // Replace with your Asana access token
const ASANA_WORKSPACE_ID = '1208103547163783'; // Replace with your Asana workspace ID
const PROJECT_ID = '1208103547163783'; // Replace with your Asana project ID

// Endpoint to receive webhook events
app.post('/webhook', async (req, res) => {
    try {
        const event = req.body.events[0];
        console.log(event,"we do have event")
    
        if (event.resource.resource_type === 'task' && event.action === 'changed') {
            const taskId = event.resource.gid;
    
            try {
                // Get task details
                const taskResponse = await axios.get(`https://app.asana.com/api/1.0/tasks/${taskId}`, {
                    headers: {
                        'Authorization': `Bearer ${ASANA_ACCESS_TOKEN}`
                    }
                });
    console.log(taskResponse,"taskresponse")
                const task = taskResponse.data.data;
                const estimatedTimeField = task.custom_fields.find(field => field.name === 'Estimated Time');

                console.log(estimatedTimeField,"estimatedTimeField")
    
                // Check if Estimated Time field is empty or not filled
                if (!estimatedTimeField || !estimatedTimeField.number_value) {
                    // Notify the user that they need to fill in the estimated time
                    await axios.post(`https://app.asana.com/api/1.0/tasks/${taskId}/stories`, {
                        text: "Please add an estimated time before marking this task as complete."
                    }, {
                        headers: {
                            'Authorization': `Bearer ${ASANA_ACCESS_TOKEN}`
                        }
                    });
    
                    // Revert the task status back to "In Progress" or any other status
                    await axios.put(`https://app.asana.com/api/1.0/tasks/${taskId}`, {
                        completed: false
                    }, {
                        headers: {
                            'Authorization': `Bearer ${ASANA_ACCESS_TOKEN}`
                        }
                    });
                }
            } catch (error) {
                console.error('Error handling webhook event:', error.response.data);
            }
        }
    
    } catch(err) {
        console.log(err)
    }
    if(req.header['x-hook-secret']) {
        const ASANA_SECRET = req.headers['x-hook-secret'];
        res.setHeader('x-hook-secret', ASANA_SECRET)
        res.status(200).send(req.body);
    }
});

// Endpoint to set up the webhook (one-time setup)
app.post('/setup-webhook', async (req, res) => {
    try {
        const response = await axios.post('https://app.asana.com/api/1.0/webhooks', {
            data: {
                resource: '1208103547163783',
                target: 'https://asana-project-8a2bcae75952.herokuapp.com/webhook', // Replace with your deployed Heroku app URL
                filters: [
                    { 
                        "action": "changed", 
                        "resource_type": "task",
                        // "custom_fields": [ "Estimated Time"] 
                    }
                ]
            }
        }, {
            headers: {
                'Authorization': `Bearer ${ASANA_ACCESS_TOKEN}`
            }
        });

        res.status(200).json({ message: 'Webhook set up successfully', webhook: response.data });
    } catch (error) {
        console.error('Error setting up webhook:', error.response.data);
        res.status(500).json({ message: 'Error setting up webhook', error: error.response.data });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
