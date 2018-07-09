import { Component } from '@angular/core';
import { ViewController, NavController, NavParams, Platform } from 'ionic-angular';
import { ToastController } from 'ionic-angular';

//plugins angularfire2

import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FirebaseServiceProvider } from '../../providers/firebase-service/firebase-service';
import { normalizeURL } from 'ionic-angular';
import { AngularFireStorage } from 'angularfire2/storage';

import { Platillo } from '../../commons/platillo';

import { ImagePicker, ImagePickerOptions } from '@ionic-native/image-picker';

import { async } from 'rxjs/internal/scheduler/async';
import { finalize } from 'rxjs/operators';

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
  assetCollection;

  //Miniatura de la Imagen
  imagePreview: string = "";
  //Imagen en formato para subir
  imagen64: string;
  //Observables
  uploadPercent: Observable<number>;
  downloadURL: Observable<string>;

  constructor(public readonly afs: AngularFirestore,
    public viewCtrl: ViewController,
    public navParams: NavParams,
    public toastCtrl: ToastController,
    public imagePicker: ImagePicker,
    public firebaseServiceProvider: FirebaseServiceProvider,
    public platform: Platform,
    public camera: Camera,
    public fireStorage: AngularFireStorage) {
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
    if (this.nombre != null && this.tipo != null) {
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


agregarPlatillo2() {
  console.log("platillo agregado");

  this.itemsCollection = this.afs.collection<Platillo>('platillo');
  /* this.platillos = this.itemsCollection.snapshotChanges().pipe(
     map(actions => actions.map(a => {
       const data = a.payload.doc.data() as Platillo;
       const id = a.payload.doc.id;
       return { id, ...data };
     }))
   ); */

  const id = this.afs.createId(); //Crea un ID automáticamente
  //El registro debe ser completo
  if (this.nombre != null && this.tipo != null && this.img != null) {
    //Cargando la imagen en el servidor
    const file = this.imagePreview;
    const filePath = '/platillos/' + this.nombre;
    const fileRef = this.fireStorage.ref(filePath);
    //Carga de imagen por funcion "upload"
    const task = this.fireStorage.upload(filePath, file);
    this.presentToast("Cargando imagen...");

    // Mostrando el porcentage de carga
    this.uploadPercent = task.percentageChanges();
    // cuando el URL de descarga se encuentra disponible
    task.snapshotChanges().pipe(
      finalize(() => {
        this.downloadURL = fileRef.getDownloadURL();
        this.downloadURL.subscribe(imgURL => {
          //console.log("imgURL: " + imgURL);
          this.img = imgURL;

          //La imagen ya se encuentra disponible (deberia)
          //Creando arreglo/objeto para su posterior envío
          const plato: Platillo = { 'nombre': this.nombre, 'tipo': this.tipo, 'img': this.img }
          console.table(plato);
          //Registrando en Firebase
          this.afs.collection('platillos').doc(id).set(plato);
          //Registro exitoso (o deberia)
          this.presentToast("¡platillo agregado!");
          //Cerrando registro
          this.viewCtrl.dismiss();

        }, (err) => {
          console.log("Error al cargar", err);
          this.presentToast("¡La imagen no pudo subirse!");
        });

      }
      )
    )
      .subscribe()

  } else {
    //El registro no es completo
    this.presentToast("¡Platillo Incompleto!");
  }

}

selectImageCamera(src:number) {

  //Formato de la imagen a tomar
  const config: CameraOptions = {
    quality: 50,
    destinationType: this.camera.DestinationType.DATA_URL,
    encodingType: this.camera.EncodingType.JPEG,
    saveToPhotoAlbum: true,
    mediaType: this.camera.MediaType.PICTURE,
    sourceType: src // 0 = Galeria, 1 = Camara
  }

  //Promesa: Sí se pudo tomar la foto con la configuración indicada..
  this.camera.getPicture(config).then((imageData) => {
    // imageData is either a base64 encoded string or a file URI
    // If it's base64 (DATA_URL):
    this.imagePreview = 'data:image/jpeg;base64,' + imageData;
    this.imagen64 = imageData;
    
    this.uploadFile(imageData);
  }, (err) => {
    console.log("Error en cámara", JSON.stringify(err));
    this.presentToast("¡No se pudo tomar la foto!");
  });

}

//Función de Galería
selectImageGallery() {

  //Configuración de la imagen
  let conf: ImagePickerOptions = {
    quality: 50,
    outputType: 1, //Devuelve un string codificado base-64
    maximumImagesCount: 1
  }

  //Promesa: sí logra tomar una foto con la configuración dada...
  this.imagePicker.getPictures(conf).then((results) => {
    for (var i = 0; i < results.length; i++) {
      // console.log('Image URI: ' + results[i]);
      this.imagePreview = 'data:image/jpeg;base64,' + results[i];
      this.imagen64 = results[i];

    }
  }, (err) => {
    console.log("ERROR: la imagen no es valida: ", JSON.stringify(err));
    this.presentToast('¡La imagen no es válida!');
  });

}

  
//Carga Asicnrona de imagenes (funciona junto a un <input type ="file">)
uploadFile(event) {
  const file = event.target.files[0];
  const filePath = '/platillos/' + this.nombre;
  const fileRef = this.fireStorage.ref(filePath);
  const task = this.fireStorage.upload(filePath, file);

  // observe percentage changes
  this.uploadPercent = task.percentageChanges();
  // get notified when the download URL is available
  task.snapshotChanges().pipe(
    finalize(() => {
      this.downloadURL = fileRef.getDownloadURL();
      //Tomando la URL tras descargarla
      this.downloadURL.subscribe(imgURL => {
        //console.log("imgURL: " + imgURL);
        this.img = imgURL;
      })

    }
    )
  )
    .subscribe()
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
