const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
// const stripe = require('stripe')(sk_test_51L0mz8C4IDVrgcznjJes3WtKlOiKFEsk4RIPj6neZjAiwDvfEqm6EOUSFqUscErRekE7QevGEKBaLK5UBz0iJe0i00XOCONFhE);
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



/* 
// mailling
var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');
 */




const app = express()
const port = process.env.PORT || 5000;


// const corsConfig = {
//   origin: true,
//   credentials: true,
// }
// app.use(cors(corsConfig))
// app.options('*', cors(corsConfig))



app.use(cors())
app.use(express.json())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eiljv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

console.log(uri);



// /* verify token function */
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access! 401 verifyJWT' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access! 403 verifyJWT' });
        }
        // console.log('decoded', decoded);
        req.decoded = decoded; // add decoded-key to request-object i.e. decoded={email:"asdf@jkl.asd", "iat": 1653364060, "exp": 1653367660}
        next();
    })
}




/* 
const emailSenderOptions = {
    auth: {
        api_key: process.env.EMAIL_SENDER_KEY
    }
}
const emailClient = nodemailer.createTransport(sgTransport(emailSenderOptions));


// sent email after booking
function sendAppointmentEmail(booking) {
    const { patient, patientName, treatment, date, slot } = booking;

    var email = {
        from: process.env.EMAIL_SENDER,
        to: patient,
        subject: `Your Appointment for ${treatment} is on ${date} at ${slot} is Confirmed`,
        text: `Your Appointment for ${treatment} is on ${date} at ${slot} is Confirmed`,
        html: `
        <div>
          <p> Hello ${patientName}, </p>
          <h3>Your Appointment for ${treatment} is confirmed</h3>
          <p>Looking forward to seeing you on ${date} at ${slot}.</p>
          
          <h3>Our Address</h3>
          <p>Andor Killa Bandorban</p>
          <p>Bangladesh</p>
          <a href="https://web.programming-hero.com/">unsubscribe</a>
        </div>
      `
    };

    emailClient.sendMail(email, function (err, info) {
        if (err) {
            console.log(err);
        }
        else {
            console.log('Message sent: ', info);
        }
    });

}



// send email after payment
function sendPaymentConfirmationEmail(booking) {
    const { patient, patientName, treatment, date, slot } = booking;

    var email = {
        from: process.env.EMAIL_SENDER,
        to: patient,
        subject: `We have received your payment for ${treatment} is on ${date} at ${slot} is Confirmed`,
        text: `Your payment for this Appointment ${treatment} is on ${date} at ${slot} is Confirmed`,
        html: `
        <div>
          <p> Hello ${patientName}, </p>
          <h3>Thank you for your payment . </h3>
          <h3>We have received your payment</h3>
          <p>Looking forward to seeing you on ${date} at ${slot}.</p>
          <h3>Our Address</h3>
          <p>Andor Killa Bandorban</p>
          <p>Bangladesh</p>
          <a href="https://web.programming-hero.com/">unsubscribe</a>
        </div>
      `
    };

    emailClient.sendMail(email, function (err, info) {
        if (err) {
            console.log(err);
        }
        else {
            console.log('Message sent: ', info);
        }
    });

}
 */



async function run() {
    try {
        await client.connect();
        const servicesCollection = client.db("serviceCollectionDoctorsPortal").collection("services");
        const bookingsCollection = client.db("serviceCollectionDoctorsPortal").collection("bookings");
        const usersCollection = client.db("serviceCollectionDoctorsPortal").collection("users");
        const doctorsCollection = client.db('serviceCollectionDoctorsPortal').collection('doctors');
        const paymentsCollection = client.db('serviceCollectionDoctorsPortal').collection('payments');


        // GET all services
        app.get('/services', async (req, res) => {
            const query = {};
            const cursor = await servicesCollection.find(query).project({ name: 1 });
            const services = await cursor.toArray();
            res.send(services)
        })


        // Warning: This is not the proper way to query multiple collection. 
        // After learning more about mongodb. use aggregate, lookup, pipeline, match, group

        // GET all availble non booked services
        app.get('/availableServices', async (req, res) => {
            // step-1: get all services
            const query = {};
            const cursor = await servicesCollection.find(query);
            const allServices = await cursor.toArray();


            // setp-2: get all bookings that booked on that date
            const date = req.query.date // date will get from client
            const query4Date = { date: date || "May 15, 2022" };
            const bookings4ThatDate = await bookingsCollection.find(query4Date).toArray(); // in short 2 line in one line
            // res.send(bookings4ThatDate)


            //step-3 : get all bookings4ThatDate for each specific service and find the slots that is not booked
            allServices.forEach(service => {
                // step-4: get all bookings for each service
                const serviceBookedOnThatDate = bookings4ThatDate.filter(booking => booking.treatment === service.name)

                // step-5: get all booked slots for each service on that date
                const slotsBookedOnThatDate4Service = serviceBookedOnThatDate.map(booking => booking.slot)

                // step-6: update booked slot in the service
                service.bookedSlots = slotsBookedOnThatDate4Service

                // step-7: get all slots available i.e. not booked on that date for each service
                const slotsAvailable4ServiceOnThatDate = service.slots.filter(slot => !slotsBookedOnThatDate4Service.includes(slot))

                // step-8: update the allServices (array of obj) with available slots
                service.availableSlots = slotsAvailable4ServiceOnThatDate
            })




            res.send(allServices)
        })



        // //POST- bookings without justifying
        // app.post('/bookings', async (req, res) => {
        //     const bookingInfo = req.body;
        //     const result = await bookingsCollection.insertOne(bookingInfo);
        //     res.send( {result, success: 'Booking Successful' })
        // })


        //POST- bookings verifying "same person same day same slot same treatment available or not"
        app.post('/bookings', async (req, res) => {
            const bookingInfo = req.body;
            const { patientName, date, slot, treatment } = bookingInfo;
            const query = { patientName, date, slot, treatment }
            const exists = await bookingsCollection.findOne(query);
            if (exists) {
                res.send({ error: 'Booking already exists', success: 'Booking Failed', booking: exists })
            } else {
                const result = await bookingsCollection.insertOne(bookingInfo);
                // console.log('sending email 4 booking');
                // sendAppointmentEmail(bookingInfo);
                res.send({ result, success: 'Booking Successful' })
            }
        })


        // // // GET all Booked apponintments asper email
        // app.get('/apponintments', async (req, res) => {
        //     const email = req.query.email;
        //     const query = {patientEmail: email};
        //     const cursor = await bookingsCollection.find(query);
        //     const apponintments = await cursor.toArray();
        //     res.send(apponintments)
        // })


        // // GET all Booked apponintments asper email with JWT
        app.get('/apponintments', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { patientEmail: email };
                const cursor = await bookingsCollection.find(query);
                const apponintments = await cursor.toArray();
                res.send(apponintments)
            } else {
                return res.status(401).send({ message: 'unauthorized access! 401 verifyJWT' });
            }
        })


        // GET one appoinmetn details asper id
        app.get('/apponintment/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingsCollection.findOne(query);
            // console.log(result);
            res.send(result)
        })


        app.patch('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const result = await paymentsCollection.insertOne(payment);
            const updatedBooking = await bookingsCollection.updateOne(filter, updatedDoc);
            // console.log('sending email 4 payment');
            // sendPaymentConfirmationEmail(nee param );
            res.send(updatedBooking);
        })


        // // GET all Booked apponintments asper email with JWT
        app.get('/allUsers', verifyJWT, async (req, res) => {

            const allUsers = await usersCollection.find().toArray();
            res.send(allUsers)

        })


        // empower an user as admin  by whom already in admin role
        app.put('/admin/:email', verifyJWT, async (req, res) => {
            const proposedEmail4Admin = req.params.email;
            const decodedEmail = req.decoded.email;
            const requesterEmail = decodedEmail;

            const requesterDetails = await usersCollection.findOne({ email: requesterEmail });


            if (requesterDetails.role === 'admin') {
                const filter = { email: proposedEmail4Admin };
                const update = { $set: { role: 'admin' } };
                const result = await usersCollection.updateOne(filter, update);
                res.send({ result, success: 'Admin role added' })
            } else {
                res.status(403).send({ error: 'forbidden authority' });
            }
        })




        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            // console.log(isAdmin);
            res.send({ admin: isAdmin })
        })


        // Generating access token and sendit it in response aaand also saving the user in db
        app.put('/login/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })

        // post doctor in db by admin
        // app.post('/doctors', verifyJWT, async (req, res) => {
        //     console.log('admin true'); 
        //     const requesterEmail = req.decoded.email;
        //     const requesterDetails = await usersCollection.findOne({ email: requesterEmail });
        //     if (requesterDetails.role === 'admin') {
        //         const doctorInfo = req.body;
        //         const result = await doctorsCollection.insertOne(doctorInfo);
        //         res.send({ result, success: 'Doctor added' })
        //     } else {
        //         return res.status(401).send({ message: 'unauthorized access! 401 verifyIsAdmin' });
        //     }
        // })

        // verify admin or not 
        const verifyAdmin = async (req, res, next) => {
            const requesterEmail = req.decoded.email;
            const requesterDetails = await usersCollection.findOne({ email: requesterEmail });
            if (requesterDetails.role === 'admin') {
                next();
            } else {
                return res.status(401).send({ message: 'unauthorized access! 401 verifyIsAdmin' });
            }
        }

        // allow post if admin true
        app.post('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
            const doctorInfo = req.body;
            // console.log(doctorInfo);
            const { email } = doctorInfo;
            const exists = await doctorsCollection.findOne({ email: email });
            if (exists) {
                res.status(403).send({ error: 'user already exists' });
            } else {
                const result = await doctorsCollection.insertOne(doctorInfo);
                res.send({ result, success: 'Doctor added' })
                console.log(result);
            }
        })

        // get all doctors
        app.get('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
            const doctors = await doctorsCollection.find().toArray();
            res.send(doctors);
        })



        // delete doctor
        app.delete('/doctors/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await doctorsCollection.deleteOne(filter);
            res.send(result);
        })



        // payment intent
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });






    } finally {

    }
}
run().catch(console.dir)


console.log(uri);




app.get('/', (req, res) => {
    res.send('Hello World! Its for CRUD Operations')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})