const router = require("express").Router(),
    path = require("path"),
    multer = require('multer'),
    fs = require("fs"),
    ImageModel = require("../model/image"),
    UserController = require("../controller/user"),
    NotesController = require("../controller/notes");
module.exports = router;


const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: function (req, file, callback) {
        callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
function checkFileType(file, callback) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
        return callback(null, true);
    } else {
        callback('Error: Images Only!');
    }
}
const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 },
    fileFilter: function (req, file, callback) {
        checkFileType(file, callback);
    }
});

router.get("/posts", (req, res) => res.render("index", { notes: req.user.notes, token: req.session.token }))
router.get("/posts/:flag", (req, res) => {
    NotesController.fetchNotes({ flag: req.params.flag, user: req.user.id }).then(notes => res.render("index", { notes, token: req.session.token }))
})

router.post("/notes", upload.any(), async (req, res) => {
    const { title, description, flag } = req.body;
    if (title && description && (flag === "public" || flag === "private") && req.files.length) {
        const images = [];
        for (let index = 0; index < req.files.length; index++) {
            const image = await ImageModel.create({ image: fs.readFileSync(req.files[index].path), contentType: req.files[index].mimetype })
            // const image = await ImageModel.create({ image: `${req.headers.host}/${req.files[index].path}`, contentType: req.files[index].mimetype })
            fs.unlinkSync(req.files[index].path);
            images.push(image.id);
        }
        NotesController.addNote({ title, description, flag, images, user: req.user.id }).then(note => {
            UserController.updateUserById(req.user.id, { $addToSet: { notes: note.id } }, (err, user) => {
                if (err) res.render("notes", { error: err.message })
                else res.redirect("http://localhost:5000/auth/notes/1");
            })
        }).catch(err => res.render("notes", { error: err.message }))
    } else res.render("notes", { error: "Missing body" })
});