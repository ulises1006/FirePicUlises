import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Bebida } from '../../commons/bebida'
/**
 * Generated class for the BebidasPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-bebidas',
  templateUrl: 'bebidas.html',
})
export class BebidasPage {
  private itemsCollection: AngularFirestoreCollection<Bebida>;

  bebidas: Observable<Bebida[]>;

  constructor(private readonly afs: AngularFirestore) {
    this.itemsCollection = afs.collection<Bebida>('bebidas');
    this.bebidas = this.itemsCollection.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Bebida;
        const id = a.payload.doc.id;
        return { id, ...data };
      }))
    );
  }
}
