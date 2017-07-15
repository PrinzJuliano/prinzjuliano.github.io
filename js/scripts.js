if (window.location.protocol !== 'https:' && !window.location.hostname.includes("localhost")) {
    window.location = 'https://' + window.location.hostname + window.location.pathname + window.location.hash;
}


// Initialize Firebase
var config = {
	apiKey: "AIzaSyBLeOe2c6uZY-p9BzHxIUccCyT-iCuyWwM",
	authDomain: "gifrepo-4b932.firebaseapp.com",
	databaseURL: "https://gifrepo-4b932.firebaseio.com",
	storageBucket: "gifrepo-4b932.appspot.com",
};
firebase.initializeApp(config);

var storage = firebase.storage();
var database = firebase.database();

var account = null

var offset = 0
var picsPerPage = 10
var pictures = []

firebase.auth().onAuthStateChanged(function(user) {
	if (user) {
    // User is signed in.
    var displayName = user.displayName;
    var email = user.email;
    var emailVerified = user.emailVerified;
    var photoURL = user.photoURL;
    var isAnonymous = user.isAnonymous;
    var uid = user.uid;
    var providerData = user.providerData;

    account= user
    
    $('#right').empty()
    $('#right').append("<li><p class='navbar-text'>Logged in as '" + (displayName || email) + "'</p></li>");
    $('#right').append("<li><a href='#' data-toggle='modal' data-target='#uploadModal'>Upload</a></li>")
    $('#right').append("<li><a href='#' onclick='logout()'>Logout</a></li>")

    if(!emailVerified)
    {
    	user.sendEmailVerification()
    	alert("Your email address is not verified!\nCheck your email account!")
    }

} else {
	$('#right').empty()
	$('#right').append('<li><a href="#" data-toggle="modal" data-target="#loginModal"">Login</a></li>')
}
});

//LOAD the pictures that are not pending
database.ref("/files/").once('value').then(function(snapshot){
	for(key in snapshot.val()){
		if(snapshot.val()[key].type == "added"){
			pictures.push(snapshot.val()[key])
		}
	}
	var numberOfTabs = pictures.length / picsPerPage
	$('#pageSelect').append("<li><a href='#' onclick='showPage("+(offset-1)+")'>Prev</a></li>")

	for(var i = 0; i < numberOfTabs; i++)
	{
		$('#pageSelect').append("<li><a href='#' onclick='showPage("+(i)+")'>"+(i+1)+"</a></li>")
	}

	$('#pageSelect').append("<li><a href='#' onclick='showPage("+(offset+1)+")'>Next</a></li>")

	displayPictures();
});

/**
	Functions
*/

function showPage(id)
{
	if(id >= 0 && id < pictures.length / picsPerPage){
		console.log("Load set of pictures")
		offset = id
		$('#pictures').empty()

		displayPictures()
	}
}

function displayPictures(){
	if(pictures.length == 0)
	{
		$('#pictures').append("<div class='row'><h3 class=''>No pictures available!</h3></div>")
	}

	for(var i = 0+offset*10; i < Math.min(10+offset*10, pictures.length); i+=2)
	{
		$('#pictures').append("<div class='row' id='pictureRow"+i+"'></div>")
		var image1 = new Image();
		image1.src = pictures[i].data;
		image1.style.width = "100%"
		image1.style.height = "100%"
		$('#pictureRow' + i).append("<div class='col-md-6'>"+
			"<div class='panel panel-default'>"+
			"<div class='panel-heading'>"+
			"<h3 class='panel-title'>"+
			pictures[i].title +
			"</h3>"+
			"</div>"+
			"<div class='panel-body' id='pictureFrame"+i+"'>"+
			"</div>"+
			"<div class='panel-footer clearfix'>"+
			"<p class='pull-left'>By " + pictures[i].author + "</p>" +
			"<a href='"+pictures[i].data+"' target='_blank' class='btn btn-primary pull-right'>Download</button>"+
			"</div>"+
			"</div>"+
			"</div>");
		$('#pictureFrame' + i).append(image1);

		if((i+1) < pictures.length){
			var image2 = new Image();
			image2.src = pictures[i+1].data;
			image2.style.width = "100%"
			image2.style.height = "100%"
			$('#pictureRow' + i).append("<div class='col-md-6'>"+
				"<div class='panel panel-default'>"+
				"<div class='panel-heading'>"+
				"<h3 class='panel-title'>"+
				pictures[i+1].title +
				"</h3>"+
				"</div>"+
				"<div class='panel-body' id='pictureFrame"+(i+1)+"'>"+
				"</div>"+
				"<div class='panel-footer clearfix'>"+
				"<p class='pull-left'>By " + pictures[i+1].author + "</p>" +
				"<a href='"+pictures[i+1].data+"' target='_blank' class='btn btn-primary pull-right'>Download</button>"+
				"</div>"+
				"</div>"+
				"</div>");
			$('#pictureFrame' + (i+1)).append(image2);
		}
	}
}

function upload(){

	if (window.File && window.FileReader && window.FileList && window.Blob) {
	  // Great success! All the File APIs are supported.
	} else {
		alert('The File APIs are not fully supported in this browser.');
		return 
	}

	var title = $('#upload_title').val()

	if($('#files').prop('files').length == 0 || title.isEmpty()){
		return
	}
	var file = $('#files').prop('files')[0];

	if(file.size > 10 * 1024 * 1024)
	{
		if(!$("#files").parent().hasClass("has-error")){
			$('#files').parent().addClass("has-error")
			$('#files').parent().append("<span id='helpTextUpload' class='help-block'>The file is bigger than 10 MB!</span>")
		} else {
			$('#helpTextUpload').html("The file is bigger than 10 MB!")
		}
		return
	}

	var metadata = {
		author: (account.displayName || account.email),
		title: title,
		type: "pending"
	}

	if(!file.type.includes("image"))
	{
		if(!$("#files").parent().hasClass("has-error")){
			$('#files').parent().addClass("has-error")
			$('#files').parent().append("<span id='helpTextUpload' class='help-block'>File must be an image!</span>")
		} else {
			$('#helpTextUpload').html("File must be an image!")
		}
		return
	}

	getBase64(file, metadata)
}

function getBase64(file, metadata) {
	var reader = new FileReader();
	reader.readAsDataURL(file);
	reader.onload = function () {
		metadata.data = reader.result;
   		//do the work
   		var key = database.ref().child("files").push().key
   		database.ref("files/" + key).set(metadata).then(function(){

   			$('#upload_title').val("")
   			$('#files').val("")

   			$('#uploadModal').modal("hide")
   		});
   	};
   	reader.onerror = function (error) {
   		if(!$("#files").parent().hasClass("has-error")){
   			$('#files').parent().addClass("has-error")
   			$('#files').parent().append("<span id='helpTextUpload' class='help-block'>"+error+"</span>")
   		} else {
   			$('#helpTextUpload').html(error);
   		}
   		return
   		return -1;
   	};
}


/**
	Login functions
*/

function googleLogin(){
	$('#loginModal').modal('hide')

	var provider = new firebase.auth.GoogleAuthProvider();

	firebase.auth().signInWithRedirect(provider);

}

function emailLoginModal(){
	$('#loginModal').modal('hide')
	$('#emailModal').modal('show')
}

function createUserModal(){
	$('#emailModal').modal('hide')
	$('#createUserModal').modal('show')
}

function emailUserAuthModal(){
	$('#emailModal').modal('hide')
	$('#emailUserAuthModal').modal('show')
}

function signUp(){
	var email = $('#create_email').val()
	var password1 = $('#create_password').val()
	var password2 = $('#create_password2').val()

	var verified = true

	if(email.isEmpty())
	{
		if(!$('#create_email').parent().hasClass("has-error")){
			$('#create_email').parent().addClass("has-error")
			$('#create_email').parent().append('<span id="helpBlock1" class="help-block">Missing email!</span>')
		} else {
			$('#helpBlock1').html("Missing email!")
		}
		verified = verified & false
	} else {
		var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

		if(re.test(email))
		{
			if($('#create_email').parent().hasClass("has-error")){
				$('#create_email').parent().removeClass("has-error")
				$('#helpBlock1').remove()
			}

			$('#create_email').parent().addClass("has-success")
			verified = verified & true;
		} else {
			if(!$('#create_email').parent().hasClass("has-error")){
				$('#create_email').parent().addClass("has-error")
				$('#create_email').parent().append('<span id="helpBlock1" class="help-block">This is not a correct email!</span>')
			} else {
				$('#helpBlock1').html("This is not a correct email!")
			}

			verified = verified & false;
		}
	}

	if(password1.isEmpty())
	{
		if(!$('#create_password').parent().hasClass("has-error"))
		{
			$('#create_password').parent().addClass("has-error")
			$('#create_password').parent().append('<span id="helpBlock2" class="help-block">Missing password!</span>')
		} else 
		{
			$('#helpBlock2').html("Missing Password!");
		}

		verified = verified & false;
	} else if(password2.isEmpty()){

		if($('#create_password').parent().hasClass("has-error"))
		{
			$('#create_password').parent().removeClass("has-error")
			$('#helpBlock2').remove()
		}

		if(!$('#create_password2').parent().hasClass("has-error"))
		{
			$('#create_password2').parent().addClass("has-error")
			$('#create_password2').parent().append('<span id="helpBlock3" class="help-block">The passwords are not equal!</span>')
		} else 
		{
			$('#helpBlock3').html("The passwords are not equal!");
		}

		verified = verified & false;

	} else {
		if($('#create_password').parent().hasClass("has-error"))
		{
			$('#create_password').parent().removeClass("has-error")
			$('#helpBlock2').remove()
		}

		if(password1 != password2)
		{
			if(!$('#create_password2').parent().hasClass("has-error"))
			{
				$('#create_password2').parent().addClass("has-error")
				$('#create_password2').parent().append('<span id="helpBlock3" class="help-block">The passwords are not equal!</span>')
			} else 
			{
				$('#helpBlock3').html("The passwords are not equal!");
			}

			verified = verified & false;
		} else {
			if($('#create_password2').parent().hasClass("has-error"))
			{
				$('#create_password2').parent().removeClass("has-error")
				$('#helpBlock3').remove()
			}

			$('#create_password').parent().addClass("has-success")
			$('#create_password2').parent().addClass("has-success")
		}
	}

	if(verified)
	{
		firebase.auth().createUserWithEmailAndPassword(email, password1).then(function(){
			$('#createUserModal').modal("hide")
		}).catch(function(error) {
		  // Handle Errors here.
		  var errorCode = error.code;
		  var errorMessage = error.message;
		  alert(errorCode + ":\n" + errorMessage)
		});
	}
}

function emailAuth(){

	var email = $('#login_email').val()
	var password = $('#login_password').val()

	firebase.auth().signInWithEmailAndPassword(email, password).then(function(){
		$('#emailUserAuthModal').modal("hide")
	}).catch(function(error) {
	  // Handle Errors here.
	  var errorCode = error.code;
	  var errorMessage = error.message;
	  alert(errorCode + ":\n" + errorMessage)
	});
}

function emailReset(){
	var email = $('#reset_email').val()
	firebase.auth().sendPasswordResetEmail(email).then(function() {
	  $('#resetPasswordModal').modal("hide")
	}, function(error) {
	  var errorCode = error.code;
	  var errorMessage = error.message;
	  alert(errorCode + ":\n" + errorMessage)
	});
}

function logout(){
	firebase.auth().signOut().then(function() {
		console.log("Signed out!");
	}).catch(function(error) {
		console.log(error);
	});
}

/**
	Prototypes
*/
String.prototype.isEmpty = function() {
	return (this.length === 0 || !this.trim());
};