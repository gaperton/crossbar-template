import { ServiceBus } from './lib/autobahnIO'

const bus = new ServiceBus({
    realm : 'realm1'
});

export default bus;