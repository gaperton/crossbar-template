import { Record, define, attr } from 'type-r'
import bus from './serviceBus'

@define
export class User extends Record {
    static endpoint = bus.endpoint( 'users' );

    @attr( String ) name : string;
    @attr( String ) email : string;
}