import { Component } from '@angular/core';
import { ViewController, NavController, NavParams, Platform } from 'ionic-angular';
import { ToastController } from 'ionic-angular';

//plugins angularfire2

import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Platillo } from '../../commons/platillo';
import { ImagePicker } from '@ionic-native/image-picker';
import { FirebaseServiceProvider } from '../../providers/firebase-service/firebase-service';
import { normalizeURL } from 'ionic-angular';
import { async } from 'rxjs/internal/scheduler/async';
import { CameraOptions, Camera } from '@ionic-native/camera';
import { storage } from 'firebase';
import 'whatwg-fetch';
import firebase from 'firebase';

@Component({
  selector: 'page-agregar',
  templateUrl: 'agregar.html',
})
export class AgregarPage {

  private itemsCollection: AngularFirestoreCollection<Platillo>;

  platillos: Observable<Platillo[]>;

  nombre: any;
  tipo: any;
  img: any;
  assetCollection

  constructor(public readonly afs: AngularFirestore,
    public viewCtrl: ViewController,
    public navParams: NavParams,
    public toastCtrl: ToastController,
    public imagePicker: ImagePicker,
    public firebaseServiceProvider: FirebaseServiceProvider,
    public platform: Platform,
    public camera: Camera) {
  }

  agregarPlatillo() {
    console.log("platillo agregado");

    this.itemsCollection = this.afs.collection<Platillo>('platillos');
    /* this.platillos = this.itemsCollection.snapshotChanges().pipe(
       map(actions => actions.map(a => {
         const data = a.payload.doc.data() as Platillo;
         const id = a.payload.doc.id;
         return { id, ...data };
       }))
     ); */

    const id = this.afs.createId();
    if (this.nombre != null && this.tipo != null && this.img != null) {
      const plato: Platillo = { 'nombre': this.nombre, 'tipo': this.tipo, 'img': this.img }
      console.table(plato);
      this.afs.collection('platillos').doc(id).set(plato);
      this.presentToast('Platillo creado exitosamente');
      this.viewCtrl.dismiss();

    } else {
      this.presentToastError();
    }

  }



  presentToastError() {
    const toast = this.toastCtrl.create({
      message: 'Faltan campos por llenar!',
      duration: 1000
    });
    toast.present();
  }

  close() {
    this.viewCtrl.dismiss();
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad AgregarPage');
  }

  loadData() {
    var result = [];
    // load data from firebase...
    firebase.database().ref('platillo').orderByKey().once('value', (_snapshot: any) => {

      _snapshot.forEach((_childSnapshot) => {
        // get the key/id and the data for display
        var element = _childSnapshot.val();
        element.id = _childSnapshot.key;

        result.push(element);
      });

      this.assetCollection = result;

  });
}

  makeFileIntoBlob(_imagePath){
    return fetch(_imagePath).then((_reponse)=>{
      return _reponse.blob();
    }).then((_bolb)=>{
      return _bolb;
    });
  }

  saveToDatabaseAssetList(_uploadSnapshot){
    var ref = firebase.database().ref('assets');

    return new Promise((resolve, reject)=>{
      var DataToSave = {
        'URL': _uploadSnapshot.downloadURL,
        'name': _uploadSnapshot.metadata.name,
        'owner': firebase.auth().currentUser.uid,
        'email': firebase.auth().currentUser.email,
        'lastUpdated': new Date().getTime(),
      };
      ref.push(DataToSave, (_response)=>{
        resolve(_response); 
      }),(_error) =>{
        reject(_error);
      }
    });
  }


  selectImageCamera() {
    
      /*const options: CameraOptions = {
        quality: 50,
        targetHeight: 500,
        targetWidth: 500,
        destinationType: this.camera.DestinationType.DATA_URL,
        encodingType: this.camera.EncodingType.JPEG,
        mediaType: this.camera.MediaType.PICTURE,
      }
      this.camera.getPicture(options).then((imageData) => {
        // imageData is either a base64 encoded string or a file URI
        // If it's base64 (DATA_URL):
        let Image = 'data:image/jpeg;base64,' + imageData;
        const pictures = storage().ref('platillos/pictures');
        pictures.putString(Image, 'data_url');
       }, (err) => {
        this.presentToast('ERROR EN CAMARAA' + err);
       });
*/
       this.camera.getPicture({
         destinationType: this.camera.DestinationType.FILE_URI,
         sourceType: this.camera.PictureSourceType.CAMERA,
         targetHeight: 640,
         correctOrientation: true
       }).then((_imagePath)=>{
         this.presentToast('obteniendo path de imagen'+ _imagePath);
         return this.makeFileIntoBlob(_imagePath); 
       }).then((_imageBlob)=> {
        this.presentToast('imagen convertida: '+ _imageBlob);

      //upload blob
        this.uploadImageToFirebase(_imageBlob);
      }).then ((_uploadSnapshot:any) =>{
        this.presentToast('IMAGEN SUBIDA'+ _uploadSnapshot.downloadURL); 
        this.img = _uploadSnapshot.downloadURL;


        //storeage reference to storage in database
        return this.saveToDatabaseAssetList(_uploadSnapshot);
      }).then ((_uploadSnapshot:any) =>{
        this.presentToast('Filw saved to asset catalog successfully'+ _uploadSnapshot.downloadURL); 
        
       }, (_error) => {
         
         this.presentToast('Error: '+ _error);
       });
      
    
  }


  selectImageGallery() {
    if (!this.platform.is('cordova')) {
      console.log('');
    }
    this.imagePicker.hasReadPermission()
      .then((result) => {
        if (result == false) {
          // no callbacks required as this opens a popup which returns
          async
          this.imagePicker.requestReadPermission();
        }
        else if (result == true) {
          this.imagePicker.getPictures({
            maximumImagesCount: 1
          })
            .then((results) => {
              for (var i = 0; i < results.length; i++) {
                this.presentToast('Imagen' + this.uploadImageToFirebase(results[i]));
                this.uploadImageToFirebase(results[i]);
              }
            }, (err) => this.presentToast('ERROR' + err));
        }
      }, (err) => {
        this.presentToast('ERROR' + err);
      });
  }

  uploadImageToFirebase(_imageBlob) {
    /*image = normalizeURL(image);
    //uploads img to firebase storage
    this.firebaseServiceProvider.uploadImage(image)
      .then(photoURL => {
        this.presentToast('Imagen guardada exitosamente')
      }), (err) => this.presentToast('ERROR' + err);*/

    var fileName = 'sample-'+new Date().getTime()+ 'jpg';

    return new Promise((resolve, reject)=>{
      var fileRef = firebase.storage().ref('platillos/'+fileName);
      var uploadTask = fileRef.put(_imageBlob);
      uploadTask.on('state_change', (_snapshot) =>{
        this.presentToast('SnapShot progress '+_snapshot);
      },(_error) => {
        reject(_error);
      },() =>{
        resolve(uploadTask.snapshot);
      });
    });
  }

  presentToast(message) {
    let toast = this.toastCtrl.create({
      message: '' + message,
      duration: 4000,
      position: 'bottom'
    });
    toast.present();
  }
}
