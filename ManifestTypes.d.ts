/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    boundValue: ComponentFramework.PropertyTypes.StringProperty;
    targetEntities: ComponentFramework.PropertyTypes.StringProperty;
    entityConfig: ComponentFramework.PropertyTypes.StringProperty;
    maxResultsPerEntity: ComponentFramework.PropertyTypes.WholeNumberProperty;
    allowMultiple: ComponentFramework.PropertyTypes.TwoOptionsProperty;
}
export interface IOutputs {
    boundValue?: string;
}
