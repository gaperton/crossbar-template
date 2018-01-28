/**
 * Autobahn WAMP Client RPC endpoint
 */
import { Connection } from 'autobahn'
import { IOEndpoint, IOPromise } from 'type-r'

export class AutobahnEndpoint implements IOEndpoint {
    constructor( protected uri, protected bus ){
    }

    protected topic( name ){
        return this.uri + '.' + name;
    }

    call( method, args ){
        return this.bus.session.call( this.topic( method ), args );
    }

    list( options ){
        return this.call( options.method || 'list', [ options ] );
    }

    update( id, json, options ){
        return this.call( options.method || 'update', [ id, json, options ] );
    }

    create( json, options ){
        return this.call( options.method || 'create', [ json, options ] );
    }

    read( id, options ){
        return this.call( options.method || 'read', [ id, options ] );
    }

    destroy( id, options ){
        return this.call( options.method || 'destroy', [ id, options ] );
    }

    subscribe( events ){
        return Promise.all(
            Object.keys( events )
                  .map( name => (
                    this.bus.session.subscribe( this.topic( name ), events[ name ] )
                  ))
        );
    }

    unsubscribe( events ){
        Object.keys( events ).forEach( name => {
            this.bus.session.unsubscribe( this.topic( name ), events[ name ] );
        });
    }
}

export class ServiceBus {
    connection : any
    session : any

    endpoint( root ){
        return new AutobahnEndpoint( root, this );
    }

    service( root, Record ){
        return new AutobahnService( root, Record, this );
    }

    constructor( options = {} ){
        const url = document.location.origin == "file://" ? 
            "ws://127.0.0.1:80/ws" :
            ( document.location.protocol === "http:" ? "ws:" : "wss:")
                + "//" + document.location.host + "/ws";

        // the WAMP connection to the Router
        //
        this.connection = new Connection({ url, realm : options.realm || 'realm1' });
    }

    connect(){
        return new Promise( ( resolve, reject ) => {
            this.connection.onopen = session => {
                console.info( `[WAMP] Connected to the server` );
                this.session = session;
                this.connection.onclose = this.onClose.bind( this );
                resolve( this );
            }

            this.connection.onclose = ( reason, details ) => {
                console.error( `[WAMP] Connection can't be established`, reason, details );
                reject( this );
            }

            this.connection.open();
        });
    }

    onClose( reason, details ){
        console.warn( `[WAMP] Connection closed`, reason, details );
    }
}

export class AutobahnService extends Messenger {
    constructor( protected root, protected Record, protected bus ){
        this.events = {
            removed : id => this.publish( 'removed', id ),
            updated : json => this.publish( 'updted', json )
        }
    }

    publish( topic, ...args ){
        this.bus.session.publish( this.root + '.' + topic, args );
    }

    connect(){
        this.Record.prototype.endpoint.subscribe( this.events );

        return this.bus.session.register( this.root, this.handleCall.bind( this ), { match: 'prefix' });
    }

    protected handleCall( args, kwargs, details ){
        let name : string; //TODO: extract procedure name;

        return this[ name ].apply( this, args );
    }

    list( options ){
        const collection = new this.Record.Collection();
        return collection.fetch( options ).then( () => collection.toJOSON() );
    }

    update( id, json, options ){
        const record = new this.Record( json );
        return record.save( options ).then( () => {} );
    }

    create( json, options ){
        const record = new this.Record( json );
        return record.save( options ).then( () => { id : record.id } );
    }

    read( id, options ){
        const record = new this.Record({ id });
        return record.fetch( options ).then( () => record.toJSON() );
    }

    destroy( id, options ){
        const record = new this.Record({ id });
        return record.destroy( options ).then( () => {} );
    }
}